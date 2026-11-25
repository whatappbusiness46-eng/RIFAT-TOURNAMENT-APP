
name: Reset ZYROX ARENA Database

on:
  workflow_dispatch:
    inputs:
      confirm_reset:
        description: "Select TRUE to permanently reset the database"
        required: true
        type: boolean
        default: false

permissions:
  contents: read

concurrency:
  group: zyrox-database-maintenance
  cancel-in-progress: false

jobs:
  reset:
    if: ${{ inputs.confirm_reset == true }}
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install --omit=dev

      - name: Validate database secrets
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
        run: |
          set -eu

          if [ -z "$DATABASE_URL" ]; then
            echo "::error::DATABASE_URL secret is missing"
            exit 1
          fi

          if [ -z "$ADMIN_EMAIL" ]; then
            echo "::error::ADMIN_EMAIL secret is missing"
            exit 1
          fi

          if [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
            echo "::error::ADMIN_PASSWORD must be at least 12 characters"
            exit 1
          fi

          echo "All required secrets are available."

      - name: Check reset script
        run: node --check server/reset-database.js

      - name: Run full database reset
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
          ADMIN_NAME: ${{ secrets.ADMIN_NAME }}
          PGSSLMODE: require
          CONFIRM_ZYROX_FULL_RESET: YES
        run: node server/reset-database.js

      - name: Verify completion
        run: echo "SUCCESS: Database reset script completed."
              
