#!/bin/bash

# Test Enhanced Analytics APIs
# Make sure the dev server is running first: npm run dev

echo "=== Testing Enhanced Analytics APIs ==="
echo ""

# Get token from test user
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicmVzdGF1cmFudElkIjoiNjhkZWM4YmFhNzUxOGZkYmNmNzJhMGIwIiwicm9sZSI6InJlc3RhdXJhbnRfb3duZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NTk1MzE2NjB9.lEXZLp0JctnmrZPsntE5kownRNHrkGqKgN1mfb9lGgA"

echo "--- Test 1: Get Correlations ---"
curl -s -X GET "http://localhost:3000/api/analytics/correlations?scope=all&minConfidence=50" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -50
echo ""

echo "--- Test 2: Get Predictions ---"
TOMORROW=$(date -v+1d +%Y-%m-%d)
curl -s -X GET "http://localhost:3000/api/analytics/predictions?date=${TOMORROW}T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -50
echo ""

echo "--- Test 3: Get Menu Insights ---"
curl -s -X GET "http://localhost:3000/api/analytics/menu-insights" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -80
echo ""

echo "--- Test 4: Get Enhanced Insights ---"
curl -s -X GET "http://localhost:3000/api/analytics/enhanced-insights" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -100
echo ""

echo "--- Test 5: Discover Correlations (POST) ---"
curl -s -X POST "http://localhost:3000/api/analytics/correlations/discover" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -50
echo ""

echo "=== Tests Complete ==="
