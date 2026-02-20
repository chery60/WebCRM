#!/bin/bash

echo "=============================================="
echo "  Supabase Configuration Fix Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}✗ .env.local file not found!${NC}"
    echo "Creating .env.local from .env.local.example..."
    cp .env.local.example .env.local
    echo -e "${YELLOW}⚠ Please edit .env.local with your actual Supabase credentials${NC}"
    exit 1
fi

echo "Checking Supabase configuration..."
echo ""

# Check NEXT_PUBLIC_SUPABASE_URL
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'=' -f2)
if [[ -z "$URL" ]]; then
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL is not set${NC}"
    HAS_ERRORS=true
elif [[ ! $URL == https://* ]]; then
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL must start with https://${NC}"
    echo "  Current value: $URL"
    HAS_ERRORS=true
else
    echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_URL is set${NC}"
fi

# Check NEXT_PUBLIC_SUPABASE_ANON_KEY
ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d'=' -f2)
if [[ -z "$ANON_KEY" ]]; then
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set${NC}"
    HAS_ERRORS=true
elif [[ ! $ANON_KEY == eyJ* ]]; then
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid (must be a JWT token starting with eyJ)${NC}"
    echo "  Current value: $ANON_KEY"
    echo ""
    echo -e "${YELLOW}  This appears to be a placeholder or incorrect key format.${NC}"
    echo -e "${YELLOW}  Valid keys look like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...${NC}"
    HAS_ERRORS=true
else
    echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_ANON_KEY format is valid${NC}"
fi

# Check SUPABASE_SERVICE_ROLE_KEY
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d'=' -f2)
if [[ -z "$SERVICE_KEY" ]]; then
    echo -e "${YELLOW}⚠ SUPABASE_SERVICE_ROLE_KEY is not set (optional for client-side)${NC}"
elif [[ ! $SERVICE_KEY == eyJ* ]]; then
    echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY is invalid (must be a JWT token starting with eyJ)${NC}"
    HAS_ERRORS=true
else
    echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE_KEY format is valid${NC}"
fi

echo ""
echo "=============================================="

if [ "$HAS_ERRORS" = true ]; then
    echo -e "${RED}Configuration has errors!${NC}"
    echo ""
    echo "How to fix:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project"
    echo "3. Go to Settings → API"
    echo "4. Copy the credentials and update .env.local:"
    echo ""
    echo "   NEXT_PUBLIC_SUPABASE_URL=<Project URL>"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>"
    echo "   SUPABASE_SERVICE_ROLE_KEY=<service_role key>"
    echo ""
    echo "5. Restart your development server"
    exit 1
else
    echo -e "${GREEN}✓ Configuration looks good!${NC}"
    echo ""
    echo "Testing connection to Supabase..."
    
    # Test connection
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $ANON_KEY" "$URL/rest/v1/")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}✓ Successfully connected to Supabase!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ Could not verify connection (HTTP $HTTP_CODE)${NC}"
        echo "  This might be a network issue or the project might be paused"
        exit 1
    fi
fi
