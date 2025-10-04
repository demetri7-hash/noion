#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicmVzdGF1cmFudElkIjoiNjhkZWM4YmFhNzUxOGZkYmNmNzJhMGIwIiwicm9sZSI6InJlc3RhdXJhbnRfb3duZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NTk2MDAxMDYsImV4cCI6MTc1OTYwMzcwNn0.-Odv4G9G-Q8UdDhJhI-hKmgHqGARlC-HWfa_4pMPKrg"

echo "=== Testing Tasks API ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v2/tasks

echo ""
echo ""
echo "=== Testing Workflows API ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v2/workflows

echo ""
echo ""
echo "=== Testing Workflow Templates API ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v2/workflows/templates
echo ""
