# Daily Expense Tracking Application

## 1. Project Overview

The Daily Expense Tracking Application is a personal finance management system that allows users to record their daily income and expenses, categorize transactions, manage budgets, analyze spending patterns, and monitor their financial position.

The application should provide dashboards, charts, reports, filters, recurring transactions, budget alerts, and secure user authentication.

The application will use:

- React for the frontend
- Next.js for backend REST APIs
- MongoDB for expense-related application data
- MySQL for authentication and user management
- JWT for authentication
- Responsive UI for desktop, tablet, and mobile

---

# 2. Technology Stack

## Frontend

Framework:

React

Recommended supporting libraries:

- React Router
- Axios
- React Hook Form
- Zod or Yup
- Bootstrap 5 or Tailwind CSS
- React Icons
- Recharts or Chart.js
- TanStack Query
- Zustand or Redux Toolkit
- date-fns
- React Toastify

Recommended:

React + TypeScript

---

## Backend

Framework:

Next.js

Recommended:

Next.js App Router

Backend APIs can be implemented using:

`app/api/*/route.ts`

Example:

```text
app/
 └── api/
      ├── auth/
      ├── expenses/
      ├── income/
      ├── categories/
      ├── budgets/
      ├── dashboard/
      └── reports/

```

---

## Authentication Database

MySQL

MySQL will store:

- User account
- Email
- Password hash
- Account status
- Roles
- Login information
- Refresh tokens
- Password reset tokens
- Authentication audit information

---

## Application Database

MongoDB

MongoDB will store:

- Expenses
- Income
- Categories
- Budgets
- Accounts
- Recurring transactions
- Savings goals
- Notifications
- Expense attachments
- Dashboard preferences

---

# 3. High-Level Architecture

```text
                        User
                          │
                          ▼
                  React Application
                          │
                   HTTPS / REST API
                          │
                          ▼
                    Next.js Backend
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
           MySQL                    MongoDB
             │                         │
      Authentication             Application Data
             │                         │
       User Accounts              Expenses
       Passwords                  Income
       Roles                      Categories
       Sessions                   Budgets
       Refresh Tokens             Reports
                                  Transactions

```

---

# 4. User Roles

Initially, the application should support two roles.

## User

A normal user can:

- Register
- Login
- Manage profile
- Add expenses
- Add income
- Create categories
- Create budgets
- View dashboard
- Generate reports
- Manage recurring transactions
- Export data

---

## Admin

Admin can:

- View registered users
- Activate/deactivate users
- View system statistics
- Manage default categories
- View login audit information
- Manage application configuration

Admin should not automatically have permission to view users' private financial information unless explicitly designed for administrative/support requirements.

---

# 5. Authentication Requirements

## Registration

The registration screen should contain:

- First name
- Last name
- Email address
- Password
- Confirm password

Optional:

- Mobile number
- Currency
- Country
- Timezone

Password requirements:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

Password must never be stored as plain text.

Recommended hashing:

Argon2 or bcrypt.

---

# 6. Login

Login screen should contain:

- Email
- Password
- Remember me
- Forgot password
- Login button
- Register link

After successful login:

Backend generates:

```text
Access Token
Refresh Token

```

Recommended:

Access token validity:

```text
15–30 minutes

```

Refresh token validity:

```text
7–30 days

```

Refresh token should be securely managed.

Recommended approach:

Use secure, HTTP-only cookies.

---

# 7. Forgot Password

Workflow:

```text
User enters email
       ↓
Backend verifies account
       ↓
Password reset token generated
       ↓
Reset link sent
       ↓
User enters new password
       ↓
Password updated
       ↓
Existing sessions optionally invalidated

```

---

# 8. User Profile

Users should be able to manage:

- Profile photo
- First name
- Last name
- Email
- Phone
- Currency
- Country
- Timezone
- Date format
- Theme
- Notification preferences

Example currencies:

```text
₹ INR
$ USD
€ EUR
£ GBP
¥ JPY

```

Default can be:

```text
INR

```

---

# 9. Dashboard

Dashboard is the primary page after login.

It should show financial information for the selected date range.

## Dashboard Summary Cards

Display:

```text
Total Balance
Total Income
Total Expenses
Today's Expense
This Month Expense
Remaining Budget
Savings

```

Example:

```text
----------------------------------------------
Total Balance           ₹42,500

Income                  ₹80,000
Expenses                ₹31,500
Savings                 ₹48,500
----------------------------------------------

```

---

# 10. Dashboard Charts

## Income vs Expense

Display monthly income compared with monthly expenses.

Recommended visualization:

Bar chart.

---

## Expense by Category

Example:

```text
Food          30%
Transport     20%
Shopping      15%
Bills         15%
Entertainment 10%
Other         10%

```

Recommended visualization:

Donut chart.

---

## Spending Trend

Show expenses by:

- Day
- Week
- Month
- Year

Recommended visualization:

Line chart.

---

## Budget Usage

Example:

```text
Food

₹6,500 / ₹10,000

█████████████░░░░░░

65%

```

---

# 11. Expense Management

Users should be able to create an expense.

Fields:

```text
Amount *
Category *
Expense Date *
Payment Method
Account
Description
Merchant
Tags
Receipt
Notes
Recurring

```

Example:

```text
Amount:
₹350

Category:
Food

Description:
Lunch

Payment Method:
UPI

Account:
HDFC Bank

Date:
09 September 2026

```

---

# 12. Expense List

Expense listing should show:

| DateDescriptionCategoryPaymentAmountAction |        |               |      |        |             |
| ------------------------------------------ | ------ | ------------- | ---- | ------ | ----------- |
| 09 Sep                                     | Lunch  | Food          | UPI  | ₹350   | Edit/Delete |
| 09 Sep                                     | Petrol | Transport     | Card | ₹1,000 | Edit/Delete |
| 08 Sep                                     | Movie  | Entertainment | UPI  | ₹500   | Edit/Delete |

Functions required:

- Add
- View
- Edit
- Delete
- Search
- Filter
- Sort
- Pagination
- Export

---

# 13. Expense Filters

Users should be able to filter expenses by:

- Today
- Yesterday
- This week
- Last week
- This month
- Last month
- Custom date
- Category
- Amount
- Payment method
- Account
- Merchant
- Tag

---

# 14. Search

Search should support:

```text
Description
Merchant
Category
Tags
Notes
Amount

```

Example:

```text
Search "Zomato"

```

Should display all transactions containing Zomato.

---

# 15. Categories

Default expense categories:

```text
Food
Groceries
Transport
Fuel
Shopping
Entertainment
Rent
Electricity
Internet
Mobile
Medical
Education
Travel
Insurance
Loan
EMI
Investment
Subscription
Family
Gifts
Personal Care
Other

```

Users should also be able to create custom categories.

Category fields:

```text
Name
Icon
Type
Description
Status

```

Type:

```text
Expense
Income

```

---

# 16. Income Management

Income fields:

```text
Amount
Source
Category
Date
Account
Payment Method
Description
Recurring

```

Income categories:

```text
Salary
Freelance
Business
Investment
Interest
Rental
Gift
Bonus
Refund
Other

```

---

# 17. Accounts

Users can create multiple financial accounts.

Examples:

```text
Cash
Bank Account
Credit Card
Debit Card
Wallet
UPI
Investment Account

```

Example accounts:

```text
Cash

HDFC Savings

SBI Savings

ICICI Credit Card

PhonePe Wallet

```

Fields:

```text
Account Name
Account Type
Opening Balance
Current Balance
Currency
Description

```

---

# 18. Payment Methods

Supported methods:

```text
Cash
UPI
Credit Card
Debit Card
Bank Transfer
Net Banking
Wallet
Cheque
Other

```

---

# 19. Budget Management

Users should be able to create budgets.

Example:

```text
Monthly Food Budget

Budget:
₹10,000

Spent:
₹6,500

Remaining:
₹3,500

```

Budget fields:

```text
Budget Name
Category
Amount
Start Date
End Date
Recurring Period
Alert Percentage

```

Recurring period:

```text
Weekly
Monthly
Yearly
Custom

```

---

# 20. Budget Alerts

Users should receive warnings when spending reaches:

```text
50%
75%
90%
100%

```

Example:

```text
You have used 90% of your Food budget.

₹9,000 of ₹10,000 spent.

```

---

# 21. Recurring Transactions

Users should be able to configure recurring expenses and income.

Examples:

```text
Rent
Netflix
Internet
Mobile Bill
Salary
Insurance
EMI
SIP

```

Frequency:

```text
Daily
Weekly
Monthly
Quarterly
Yearly
Custom

```

Example:

```text
Netflix

Amount:
₹649

Frequency:
Monthly

Execution Date:
10th of every month

```

---

# 22. Reports

The application should provide reports for:

- Daily expense
- Weekly expense
- Monthly expense
- Yearly expense
- Category report
- Income report
- Expense report
- Income vs expense
- Budget report
- Payment method report
- Account report

---

# 23. Report Filters

Reports should support:

```text
Date Range
Category
Account
Payment Method
Amount Range
Transaction Type

```

---

# 24. Export

Reports and transactions should be exportable as:

```text
CSV
Excel
PDF

```

---

# 25. Savings Goals

Users should be able to create savings goals.

Example:

```text
Buy Laptop

Target Amount:
₹1,50,000

Saved:
₹70,000

Remaining:
₹80,000

```

Fields:

```text
Goal Name
Target Amount
Current Amount
Target Date
Description
Status

```

---

# 26. Notification Module

Notifications should be generated for:

- Budget threshold reached
- Budget exceeded
- Upcoming recurring payment
- Monthly report available
- Savings goal progress
- Failed recurring transaction
- Account security activity

---

# 27. User Settings

Settings should contain:

## General

- Currency
- Timezone
- Date format
- Language

## Appearance

- Light
- Dark
- System

## Notification

- Email notifications
- Budget alerts
- Recurring expense reminder
- Monthly report notification

## Security

- Change password
- Logout all devices
- Login history

---

# 28. MySQL Database Design

## users

```sql
users
-------------------------------
id
first_name
last_name
email
password_hash
phone
role
status
email_verified
created_at
updated_at

```

---

## refresh\_tokens

```sql
refresh_tokens
-------------------------------
id
user_id
token_hash
expires_at
revoked
created_at

```

---

## password\_reset\_tokens

```sql
password_reset_tokens
-------------------------------
id
user_id
token_hash
expires_at
used
created_at

```

---

## login\_history

```sql
login_history
-------------------------------
id
user_id
ip_address
device
browser
login_status
login_time

```

---

# 29. MongoDB Collections

Recommended MongoDB collections:

```text
expenses
income
categories
accounts
budgets
recurringTransactions
savingsGoals
notifications
userPreferences
attachments

```

---

# 30. Expense MongoDB Model

Example:

```json
{
  "_id": "ObjectId",
  "userId": 101,
  "amount": 350,
  "currency": "INR",
  "categoryId": "ObjectId",
  "accountId": "ObjectId",
  "paymentMethod": "UPI",
  "description": "Lunch",
  "merchant": "Restaurant",
  "expenseDate": "2026-09-09",
  "tags": [
    "food",
    "office"
  ],
  "notes": "",
  "receiptUrl": "",
  "isRecurring": false,
  "createdAt": "",
  "updatedAt": ""
}

```

`userId` corresponds to the authenticated user's MySQL user ID.

---

# 31. Category Model

```json
{
  "_id": "ObjectId",
  "userId": 101,
  "name": "Food",
  "type": "EXPENSE",
  "icon": "utensils",
  "isDefault": false,
  "status": "ACTIVE",
  "createdAt": "",
  "updatedAt": ""
}

```

---

# 32. Budget Model

```json
{
  "_id": "ObjectId",
  "userId": 101,
  "name": "Monthly Food",
  "categoryId": "ObjectId",
  "amount": 10000,
  "period": "MONTHLY",
  "startDate": "",
  "endDate": "",
  "alertPercentage": [
    50,
    75,
    90,
    100
  ],
  "status": "ACTIVE"
}

```

---

# 33. API Requirements

Base API:

```text
/api

```

---

# 34. Authentication APIs

```text
POST /api/auth/register

POST /api/auth/login

POST /api/auth/logout

POST /api/auth/refresh

POST /api/auth/forgot-password

POST /api/auth/reset-password

GET /api/auth/me

```

---

# 35. Expense APIs

```text
GET    /api/expenses

GET    /api/expenses/:id

POST   /api/expenses

PUT    /api/expenses/:id

DELETE /api/expenses/:id

```

Additional:

```text
GET /api/expenses/search

GET /api/expenses/summary

GET /api/expenses/category-summary

```

---

# 36. Income APIs

```text
GET    /api/income

GET    /api/income/:id

POST   /api/income

PUT    /api/income/:id

DELETE /api/income/:id

```

---

# 37. Category APIs

```text
GET    /api/categories

POST   /api/categories

PUT    /api/categories/:id

DELETE /api/categories/:id

```

---

# 38. Budget APIs

```text
GET    /api/budgets

POST   /api/budgets

PUT    /api/budgets/:id

DELETE /api/budgets/:id

```

---

# 39. Dashboard APIs

```text
GET /api/dashboard/summary

GET /api/dashboard/income-expense

GET /api/dashboard/category-expenses

GET /api/dashboard/spending-trend

GET /api/dashboard/budget-summary

```

---

# 40. Report APIs

```text
GET /api/reports/daily

GET /api/reports/weekly

GET /api/reports/monthly

GET /api/reports/yearly

GET /api/reports/category

GET /api/reports/accounts

GET /api/reports/income-expense

```

---

# 41. Recommended Frontend Structure

```text
src/
│
├── components/
│   ├── common/
│   ├── layout/
│   ├── charts/
│   ├── tables/
│   ├── forms/
│   └── modals/
│
├── pages/
│   ├── auth/
│   ├── dashboard/
│   ├── expenses/
│   ├── income/
│   ├── budgets/
│   ├── accounts/
│   ├── reports/
│   ├── savings/
│   └── settings/
│
├── services/
│   ├── auth.service.ts
│   ├── expense.service.ts
│   ├── income.service.ts
│   ├── budget.service.ts
│   └── report.service.ts
│
├── hooks/
│
├── store/
│
├── utils/
│
├── types/
│
├── constants/
│
└── assets/

```

---

# 42. Recommended Next.js Backend Structure

```text
src/
│
├── app/
│   └── api/
│       ├── auth/
│       ├── expenses/
│       ├── income/
│       ├── categories/
│       ├── accounts/
│       ├── budgets/
│       ├── dashboard/
│       ├── reports/
│       ├── savings/
│       └── notifications/
│
├── config/
│   ├── mongodb.ts
│   └── mysql.ts
│
├── models/
│   ├── mysql/
│   └── mongodb/
│
├── repositories/
│
├── services/
│
├── middleware/
│
├── validators/
│
├── utils/
│
└── types/

```

---

# 43. Backend Layer Architecture

Recommended pattern:

```text
Route
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
Database

```

Example:

```text
Expense API
     ↓
Expense Controller
     ↓
Expense Service
     ↓
Expense Repository
     ↓
MongoDB

```

---

# 44. Validation Requirements

Backend validation should be mandatory.

Validate:

```text
Required fields
Amount > 0
Valid dates
Valid ObjectId
Valid category
Valid account
Valid payment method
Valid authenticated user

```

Use:

Zod

Example:

```typescript
const expenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  categoryId: z.string(),
  expenseDate: z.string()
});

```

---

# 45. Security Requirements

The system should implement:

- HTTPS
- Password hashing
- JWT validation
- Secure refresh tokens
- HTTP-only cookies
- SameSite cookies
- Input validation
- Rate limiting
- SQL injection protection
- NoSQL injection protection
- XSS protection
- CSRF protection where required
- Secure headers
- Authentication middleware
- Authorization middleware

Sensitive data must never be logged.

---

# 46. Authorization Rule

Every financial MongoDB query must contain the authenticated user ID.

For example:

```typescript
{
  _id: expenseId,
  userId: authenticatedUser.id
}

```

Never query financial records only by `_id`.

This prevents one user from accessing another user's expenses.

---

# 47. Error Response Standard

Use a consistent API structure.

Success:

```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {}
}

```

Failure:

```json
{
  "success": false,
  "message": "Expense not found",
  "errorCode": "EXPENSE_NOT_FOUND"
}

```

---

# 48. HTTP Status Codes

Use:

```text
200 OK

201 Created

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

```

---

# 49. Audit Fields

All important MongoDB documents should contain:

```text
createdAt
updatedAt
createdBy
updatedBy

```

For soft deletion:

```text
isDeleted
deletedAt
deletedBy

```

---

# 50. Pagination

Expense API should support server-side pagination.

Example:

```text
GET /api/expenses?page=1&pageSize=10

```

Response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalRecords": 57,
    "totalPages": 6
  }
}

```

UI:

```text
Showing 1 to 10 of 57 entries

« ‹ 1 2 3 4 5 6 › »

```

---

# 51. Sorting

Support:

```text
Date
Amount
Category
Created date
Updated date

```

Example:

```text
/api/expenses?sortBy=expenseDate&sortOrder=desc

```

---

# 52. Responsive Design

The application must support:

```text
Desktop
Laptop
Tablet
Mobile

```

Desktop layout:

```text
Sidebar
+
Top Navigation
+
Main Content

```

Mobile:

```text
Collapsible navigation
+
Responsive cards
+
Scrollable tables

```

---

# 53. Sidebar Menu

Recommended sidebar:

```text
Dashboard

Transactions
 ├── Expenses
 ├── Income
 └── All Transactions

Categories

Accounts

Budgets

Recurring

Savings Goals

Reports

Notifications

Settings

```

---

# 54. Dashboard UI

Example layout:

```text
------------------------------------------------------
              Daily Expense Tracker
------------------------------------------------------

Balance        Income        Expenses       Savings

₹45,000        ₹80,000       ₹35,000        ₹45,000

------------------------------------------------------

Income vs Expense       | Expense Categories

      Chart              |     Donut Chart

------------------------------------------------------

Monthly Spending Trend

                 Line Chart

------------------------------------------------------

Budget Overview

Food             65%
Transport        42%
Entertainment    80%

------------------------------------------------------

Recent Transactions

Food      Lunch             -₹350
Salary    Monthly Salary   +₹80,000
Fuel      Petrol           -₹1,000

------------------------------------------------------

```

---

# 55. Important Business Rules

1. Users can access only their own financial data.
2. Expense amount must be greater than zero.
3. Deleted transactions should preferably use soft deletion.
4. Categories used in existing transactions should not be permanently removed.
5. Budget spending should automatically recalculate when expenses change.
6. Account balances should automatically update when transactions are added, modified, or deleted.
7. Recurring transactions should prevent accidental duplicate generation.
8. All money calculations must use an appropriate decimal representation rather than floating-point arithmetic.
9. Date/time values should be stored consistently and converted based on the user's timezone.
10. Every protected API must validate authentication.

---

# 56. MVP Features

For Version 1, implement:

- Registration
- Login
- Logout
- Dashboard
- Expense CRUD
- Income CRUD
- Categories
- Accounts
- Search
- Filtering
- Pagination
- Monthly summary
- Income vs expense chart
- Expense category chart
- User profile
- Dark/light theme

---

# 57. Version 2

Add:

- Budgets
- Budget alerts
- Recurring expenses
- Recurring income
- Savings goals
- Advanced reports
- PDF export
- Excel export
- Notifications

---

# 58. Version 3

Add:

- Receipt upload
- OCR receipt scanning
- Automatic expense categorization
- AI spending insights
- Financial recommendations
- Family/shared accounts
- Multiple currencies
- PWA/mobile installation
- Offline transaction entry

---

# 59. Advanced AI Features

Future AI capabilities could include:

## Automatic Categorization

Input:

```text
Swiggy ₹450

```

AI predicts:

```text
Food

```

---

## Spending Insights

Example:

```text
Your food spending increased by 18% compared with last month.

```

---

## Financial Forecast

Example:

```text
Based on your current spending, your expected monthly expense is ₹42,300.

```

---

## Unusual Spending Detection

Example:

```text
Your ₹8,000 entertainment expense is significantly higher than your normal monthly average.

```

---

# 60. Recommended Development Phases

## Phase 1

Project setup

- React frontend
- Next.js backend
- MongoDB connection
- MySQL connection
- Environment configuration

---

## Phase 2

Authentication

- Registration
- Login
- JWT
- Refresh token
- Logout
- Authentication middleware

---

## Phase 3

Core Finance Module

- Categories
- Accounts
- Expenses
- Income

---

## Phase 4

Dashboard

- Summary cards
- Charts
- Recent transactions
- Monthly statistics

---

## Phase 5

Budget

- Budget creation
- Budget usage calculation
- Budget alerts

---

## Phase 6

Reports

- Filters
- Charts
- CSV
- Excel
- PDF

---

## Phase 7

Advanced Features

- Recurring transactions
- Savings goals
- Notifications
- Attachments

---

# 61. Recommended Final Architecture

```text
expense-tracker/
│
├── frontend/
│
│   ├── React
│   ├── TypeScript
│   ├── Bootstrap/Tailwind
│   ├── React Query
│   ├── Zustand
│   └── Recharts
│
├── backend/
│
│   ├── Next.js
│   ├── TypeScript
│   ├── Zod
│   ├── JWT
│   ├── MySQL Client/ORM
│   └── MongoDB/Mongoose
│
├── databases/
│
│   ├── MySQL
│   │      └── Authentication
│   │
│   └── MongoDB
│          └── Financial Data
│
└── deployment/
       ├── Docker
       ├── CI/CD
       └── Environment Configuration

```

---

# 62. Recommended ORM / Database Libraries

For MySQL:

```text
Prisma

```

Recommended because authentication data is relational and Prisma provides migrations and type safety.

For MongoDB:

```text
Mongoose

```

or MongoDB Native Driver.

Recommended combination:

```text
MySQL
   ↓
Prisma

MongoDB
   ↓
Mongoose

```

---

# 63. Environment Variables

Example:

```env
MYSQL_DATABASE_URL=

MONGODB_URI=

JWT_ACCESS_SECRET=

JWT_REFRESH_SECRET=

ACCESS_TOKEN_EXPIRY=15m

REFRESH_TOKEN_EXPIRY=7d

APP_URL=

API_URL=

EMAIL_HOST=

EMAIL_PORT=

EMAIL_USERNAME=

EMAIL_PASSWORD=

```

Secrets must never be committed to Git.

---

# 64. Final Application Scope

The completed platform should allow a user to:

```text
Register
        ↓
Login
        ↓
Create financial accounts
        ↓
Create categories
        ↓
Add income
        ↓
Add daily expenses
        ↓
Track account balance
        ↓
Create monthly budgets
        ↓
Monitor spending
        ↓
View charts
        ↓
Analyze spending
        ↓
Generate reports
        ↓
Export financial data
        ↓
Create savings goals
        ↓
Receive budget notifications

```

The primary goal is to provide a secure, fast, responsive, and scalable personal finance platform capable of evolving from a basic daily expense tracker into a complete personal money-management application.