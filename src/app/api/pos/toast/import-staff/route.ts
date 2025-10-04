import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';
import { decryptToastCredentials } from '@/utils/toastEncryption';
import { UserRole } from '@/models/Restaurant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/pos/toast/import-staff
 * Import employees from Toast POS and create user accounts
 */
export async function POST(request: NextRequest) {
  const authResult = await authorize('users:all', 'create')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const restaurant = await Restaurant.findById(user.restaurantId);

    if (!restaurant || !restaurant.posConfig?.clientId) {
      return NextResponse.json(
        { error: 'Toast POS not configured' },
        { status: 400 }
      );
    }

    // Decrypt Toast credentials
    const credentials = decryptToastCredentials({
      clientId: restaurant.posConfig.clientId,
      encryptedClientSecret: restaurant.posConfig.encryptedClientSecret!,
      locationId: restaurant.posConfig.locationId!
    });

    // Get Toast access token
    const tokenResponse = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });

    if (!tokenResponse.ok) {
      console.error('Toast authentication failed:', await tokenResponse.text());
      return NextResponse.json(
        { error: 'Failed to authenticate with Toast' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Fetch employees from Toast
    const employeesResponse = await fetch(
      `https://ws-api.toasttab.com/labor/v1/employees?restaurantGuid=${credentials.locationGuid}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Toast-Restaurant-External-ID': credentials.locationGuid
        }
      }
    );

    if (!employeesResponse.ok) {
      console.error('Toast employees fetch failed:', await employeesResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch employees from Toast' },
        { status: 500 }
      );
    }

    const toastEmployees = await employeesResponse.json();

    // Import employees into our system
    const importedStaff = [];
    const skippedStaff = [];

    for (const toastEmployee of toastEmployees) {
      try {
        // Check if employee already exists in our restaurant's team
        const existingEmployee = restaurant.team?.employees?.find(
          (emp: any) => emp.toastEmployeeId === toastEmployee.guid
        );

        if (existingEmployee) {
          skippedStaff.push({
            name: `${toastEmployee.firstName} ${toastEmployee.lastName}`,
            reason: 'Already imported'
          });
          continue;
        }

        // Determine role based on Toast job title
        let role = UserRole.EMPLOYEE;
        const jobTitle = toastEmployee.jobTitle?.toLowerCase() || '';

        if (jobTitle.includes('manager') || jobTitle.includes('supervisor')) {
          role = UserRole.MANAGER;
        }

        // Create employee record
        const employeeData = {
          userId: toastEmployee.email || `${toastEmployee.guid}@toast.imported`,
          toastEmployeeId: toastEmployee.guid,
          email: toastEmployee.email || null,
          firstName: toastEmployee.firstName,
          lastName: toastEmployee.lastName,
          role: role,
          phone: toastEmployee.phoneNumber || null,
          isActive: toastEmployee.deletedDate ? false : true,

          // Gamification fields (initialize)
          points: 0,
          level: 1,
          streak: 0,
          badges: [],

          // Toast-specific data
          toastData: {
            externalId: toastEmployee.externalId,
            chosenName: toastEmployee.chosenName,
            jobTitle: toastEmployee.jobTitle,
            wage: toastEmployee.wage,
            createdDate: toastEmployee.createdDate,
            modifiedDate: toastEmployee.modifiedDate
          },

          importedAt: new Date(),
          importedFrom: 'toast'
        };

        // Add to restaurant's team
        if (!restaurant.team) {
          restaurant.team = { employees: [] };
        }
        if (!restaurant.team.employees) {
          restaurant.team.employees = [];
        }

        restaurant.team.employees.push(employeeData);
        importedStaff.push({
          name: `${toastEmployee.firstName} ${toastEmployee.lastName}`,
          email: employeeData.email,
          role: role,
          toastId: toastEmployee.guid
        });

      } catch (error) {
        console.error(`Error importing employee ${toastEmployee.guid}:`, error);
        skippedStaff.push({
          name: `${toastEmployee.firstName} ${toastEmployee.lastName}`,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Save restaurant with imported employees
    await restaurant.save();

    return NextResponse.json({
      success: true,
      message: `Imported ${importedStaff.length} employees from Toast`,
      data: {
        imported: importedStaff,
        skipped: skippedStaff,
        totalFromToast: toastEmployees.length,
        totalImported: importedStaff.length,
        totalSkipped: skippedStaff.length
      }
    });

  } catch (error) {
    console.error('Staff import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import staff',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
