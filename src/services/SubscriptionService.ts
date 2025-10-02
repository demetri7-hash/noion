import Stripe from 'stripe';
import { Restaurant, RestaurantStatus } from '../models';

// Stripe configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key', {
  apiVersion: '2023-10-16'
});

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  PULSE: {
    id: 'pulse',
    name: 'Pulse',
    description: 'Essential insights and lead generation',
    priceId: process.env.STRIPE_PULSE_PRICE_ID || 'price_pulse_mock',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Basic revenue insights',
      'Customer flow analysis',
      'Peak hour identification',
      'Monthly reports',
      'Email support'
    ],
    limits: {
      locations: 1,
      users: 3,
      monthlyReports: 12,
      apiCalls: 1000
    }
  },
  INTELLIGENCE: {
    id: 'intelligence',
    name: 'Intelligence',
    description: 'Comprehensive analytics and AI insights',
    priceId: process.env.STRIPE_INTELLIGENCE_PRICE_ID || 'price_intelligence_mock',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    features: [
      'Advanced AI insights',
      'Revenue optimization recommendations',
      'Staff performance analytics',
      'Menu engineering insights',
      'Real-time alerts',
      'Custom reports',
      'Priority support'
    ],
    limits: {
      locations: 3,
      users: 10,
      monthlyReports: 50,
      apiCalls: 10000
    }
  },
  COMMAND: {
    id: 'command',
    name: 'Command',
    description: 'Enterprise multi-location management',
    priceId: process.env.STRIPE_COMMAND_PRICE_ID || 'price_command_mock',
    monthlyPrice: 2500,
    yearlyPrice: 25000,
    features: [
      'Multi-location analytics',
      'Advanced forecasting',
      'Custom integrations',
      'Dedicated account manager',
      'White-label options',
      'API access',
      'Custom training'
    ],
    limits: {
      locations: 50,
      users: 100,
      monthlyReports: 500,
      apiCalls: 100000
    }
  }
};

// Billing interfaces
interface ISubscriptionResult {
  success: boolean;
  message: string;
  subscription?: any;
  clientSecret?: string;
  error?: string;
}

interface IBillingPortalResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Subscription Management Service
 * Handles Stripe integration, billing, and subscription lifecycle
 */
export class SubscriptionService {

  /**
   * Create subscription for restaurant
   */
  async createSubscription(
    restaurantId: string,
    planId: string,
    paymentMethodId?: string,
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): Promise<ISubscriptionResult> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return { success: false, message: 'Restaurant not found' };
      }

      const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
      if (!plan) {
        return { success: false, message: 'Invalid subscription plan' };
      }

      // Create or retrieve Stripe customer
      let customerId = restaurant.billing?.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: restaurant.owner.email,
          name: `${restaurant.owner.firstName} ${restaurant.owner.lastName}`,
          metadata: {
            restaurantId: restaurantId,
            restaurantName: restaurant.name
          }
        });
        customerId = customer.id;
        
        // Update restaurant with customer ID
        (restaurant as any).billing = {
          ...restaurant.billing,
          stripeCustomerId: customerId
        };
        await restaurant.save();
      }

      // Create subscription
      const subscriptionData: any = {
        customer: customerId,
        items: [{
          price: plan.priceId
        }],
        metadata: {
          restaurantId: restaurantId,
          planId: planId,
          billingCycle: billingCycle
        },
        trial_period_days: restaurant.status === 'trial' ? 14 : undefined
      };

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      } else {
        subscriptionData.payment_behavior = 'default_incomplete';
        subscriptionData.payment_settings = {
          save_default_payment_method: 'on_subscription'
        };
      }

      const subscription = await stripe.subscriptions.create(subscriptionData);

      // Update restaurant subscription status
      restaurant.subscription = {
        ...restaurant.subscription,
        plan: planId,
        status: subscription.status as any,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        billingCycle: billingCycle
      };

      if (subscription.status === 'active') {
        restaurant.status = RestaurantStatus.ACTIVE;
      }

      await restaurant.save();

      console.log(`✅ Subscription created for restaurant ${restaurant.name}: ${planId}`);

      return {
        success: true,
        message: 'Subscription created successfully',
        subscription: subscription,
        clientSecret: subscription.latest_invoice ? 
          (subscription.latest_invoice as any).payment_intent?.client_secret : undefined
      };

    } catch (error: any) {
      console.error('Subscription creation error:', error);
      return { 
        success: false, 
        message: 'Failed to create subscription',
        error: error.message 
      };
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(
    restaurantId: string,
    newPlanId: string,
    billingCycle?: 'monthly' | 'annual'
  ): Promise<ISubscriptionResult> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.subscription?.stripeSubscriptionId) {
        return { success: false, message: 'No active subscription found' };
      }

      const newPlan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === newPlanId);
      if (!newPlan) {
        return { success: false, message: 'Invalid subscription plan' };
      }

      const subscription = await stripe.subscriptions.retrieve(
        restaurant.subscription.stripeSubscriptionId
      );

      // Update subscription item
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPlan.priceId
        }],
        metadata: {
          ...subscription.metadata,
          planId: newPlanId,
          billingCycle: billingCycle || restaurant.subscription.billingCycle
        },
        proration_behavior: 'always_invoice'
      });

      // Update restaurant record
      restaurant.subscription.plan = newPlanId;
      if (billingCycle) {
        restaurant.subscription.billingCycle = billingCycle;
      }
      await restaurant.save();

      console.log(`✅ Subscription updated for restaurant ${restaurant.name}: ${newPlanId}`);

      return {
        success: true,
        message: 'Subscription updated successfully'
      };

    } catch (error: any) {
      console.error('Subscription update error:', error);
      return { 
        success: false, 
        message: 'Failed to update subscription',
        error: error.message 
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    restaurantId: string,
    immediately: boolean = false
  ): Promise<ISubscriptionResult> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.subscription?.stripeSubscriptionId) {
        return { success: false, message: 'No active subscription found' };
      }

      const canceledSubscription = immediately 
        ? await stripe.subscriptions.cancel(restaurant.subscription.stripeSubscriptionId)
        : await stripe.subscriptions.update(restaurant.subscription.stripeSubscriptionId, {
            cancel_at_period_end: true
          });

      // Update restaurant status
      if (immediately) {
        restaurant.subscription.status = 'canceled';
        restaurant.status = RestaurantStatus.CHURNED;
      } else {
        restaurant.subscription.cancelAtPeriodEnd = true;
      }

      await restaurant.save();

      console.log(`✅ Subscription ${immediately ? 'canceled' : 'scheduled for cancellation'} for restaurant ${restaurant.name}`);

      return {
        success: true,
        message: immediately 
          ? 'Subscription canceled immediately' 
          : 'Subscription will cancel at period end',
        subscription: canceledSubscription
      };

    } catch (error: any) {
      console.error('Subscription cancellation error:', error);
      return { 
        success: false, 
        message: 'Failed to cancel subscription',
        error: error.message 
      };
    }
  }

  /**
   * Create billing portal session
   */
  async createBillingPortalSession(restaurantId: string): Promise<IBillingPortalResult> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant?.billing?.stripeCustomerId) {
        return { success: false, error: 'No billing customer found' };
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: restaurant.billing.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing`
      });

      return {
        success: true,
        url: session.url
      };

    } catch (error: any) {
      console.error('Billing portal error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Handle subscription update webhook
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const restaurantId = subscription.metadata.restaurantId;
    if (!restaurantId) return;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return;

    restaurant.subscription = {
      ...restaurant.subscription,
      status: subscription.status as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };

    // Update restaurant status based on subscription
    if (subscription.status === 'active') {
      restaurant.status = RestaurantStatus.ACTIVE;
    } else if (subscription.status === 'past_due') {
      restaurant.status = RestaurantStatus.SUSPENDED;
    }

    await restaurant.save();
    console.log(`📱 Subscription updated via webhook for restaurant ${restaurant.name}`);
  }

  /**
   * Handle subscription deletion webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const restaurantId = subscription.metadata.restaurantId;
    if (!restaurantId) return;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return;

    restaurant.subscription.status = 'canceled';
    restaurant.status = RestaurantStatus.CHURNED;
    await restaurant.save();

    console.log(`❌ Subscription deleted via webhook for restaurant ${restaurant.name}`);
  }

  /**
   * Handle successful payment webhook
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const restaurant = await Restaurant.findOne({
      'billing.stripeCustomerId': customerId
    });

    if (!restaurant) return;

    // Update payment history
    if (!restaurant.billing) {
      (restaurant as any).billing = {};
    }

    if (!(restaurant as any).billing.paymentHistory) {
      (restaurant as any).billing.paymentHistory = [];
    }

    (restaurant as any).billing.paymentHistory.push({
      invoiceId: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      status: 'succeeded',
      paidAt: new Date(invoice.status_transitions.paid_at! * 1000)
    });

    await restaurant.save();
    console.log(`💰 Payment succeeded for restaurant ${restaurant.name}: $${invoice.amount_paid / 100}`);
  }

  /**
   * Handle failed payment webhook
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const restaurant = await Restaurant.findOne({
      'billing.stripeCustomerId': customerId
    });

    if (!restaurant) return;

    // Mark restaurant as suspended for failed payments
    restaurant.status = RestaurantStatus.SUSPENDED;
    await restaurant.save();

    console.log(`❌ Payment failed for restaurant ${restaurant.name}`);
    
    // TODO: Send payment failure notification email
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(): Promise<{
    totalMRR: number;
    totalARR: number;
    churnRate: number;
    conversionRate: number;
    planDistribution: Array<{ plan: string; count: number; percentage: number }>;
  }> {
    try {
      const restaurants = await Restaurant.find({});
      
      let totalMRR = 0;
      const planCounts: { [key: string]: number } = {};
      let activeSubscriptions = 0;
      let trialConversions = 0;
      let totalTrials = 0;

      restaurants.forEach(restaurant => {
        if (restaurant.subscription?.status === 'active') {
          activeSubscriptions++;
          const plan = SUBSCRIPTION_PLANS[restaurant.subscription.plan as keyof typeof SUBSCRIPTION_PLANS];
          if (plan) {
            totalMRR += plan.monthlyPrice;
            planCounts[plan.name] = (planCounts[plan.name] || 0) + 1;
          }
        }

        if (restaurant.status === 'trial') {
          totalTrials++;
        }

        // Count conversions from trial to paid
        if (restaurant.subscription?.status === 'active' && restaurant.features?.discoveryReportSent) {
          trialConversions++;
        }
      });

      const totalARR = totalMRR * 12;
      const conversionRate = totalTrials > 0 ? (trialConversions / totalTrials) * 100 : 0;
      
      // Calculate monthly churn (simplified)
      const churnedThisMonth = restaurants.filter(r => 
        r.status === 'churned' && 
        r.updatedAt && 
        r.updatedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      const churnRate = activeSubscriptions > 0 ? (churnedThisMonth / activeSubscriptions) * 100 : 0;

      const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
        plan,
        count,
        percentage: (count / activeSubscriptions) * 100
      }));

      return {
        totalMRR,
        totalARR,
        churnRate,
        conversionRate,
        planDistribution
      };

    } catch (error) {
      console.error('Failed to get subscription analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();