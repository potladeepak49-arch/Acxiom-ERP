# AcxiomCRM

AcxiomCRM is a customer relationship management application built to
help a team keep customer information, leads, sales opportunities and
follow-up activities in one place. It also includes user access
management, audit history and reports so that administrators and
managers can keep track of what is happening across the CRM.

## Features

-   **Dashboard:** A central view of CRM activity and key business
    figures.
-   **Customer management:** Add, view, update, search and deactivate
    customer records.
-   **Lead management:** Track leads, their sources, priorities,
    expected values and current status.
-   **Opportunity management:** Manage sales opportunities through
    Qualification, Proposal, Negotiation, Won and Lost stages. The
    reports include weighted pipeline value.
-   **Follow-up management:** Schedule and update customer or lead
    follow-ups, with statuses such as Planned and Completed.
-   **Activity management:** Record calls, meetings, emails and tasks
    against customers or leads.
-   **User management:** Admin users can create and update accounts,
    assign roles and activate or deactivate users.
-   **Audit logs:** Review recorded changes and actions in the system.
-   **Reports and analytics:** View customer, lead, follow-up and
    opportunity summaries, pipeline charts and recent audit activity.
    The audit report can be exported to CSV.

## Technology

### Frontend

-   React
-   Vite
-   React Router
-   Axios
-   Bootstrap and React-Bootstrap
-   Chart.js and react-chartjs-2
-   Lucide React

### Backend

-   Node.js
-   Express
-   PostgreSQL
-   `pg`
-   JWT authentication
-   `bcryptjs` for password hashing
-   Zod for request validation
-   Helmet, CORS and express-rate-limit

## Project structure

``` text
AcxiomCRM/
├── backend/
│   ├── database/
│   │   └── schema.sql
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── validators/
│   │   └── server.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   ├── services/
    │   ├── styles/
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

## Requirements

Install the following before running the application:

-   Node.js and npm
-   PostgreSQL
-   Git (optional, for cloning and version control)

## Getting started

### 1. Get the project

If the project is in a Git repository, clone it and enter the project
directory:

``` bash
git clone <repository-url>
cd AcxiomCRM
```

If you already have the project folder, open a terminal in that folder
instead.

### 2. Create the database

Create a PostgreSQL database named `acxiomcrm_db`.

Then, from the `backend` directory, run the schema file:

``` bash
psql -U postgres -h localhost -p 5432 -d acxiomcrm_db -f database/schema.sql
```

If PostgreSQL is installed on Windows and `psql` is not available in
PATH, run it using the full path to your PostgreSQL `bin` directory.

### 3. Configure the backend

Open `backend` and create a `.env` file using the variable names
expected by `src/config/db.js`, `src/server.js` and the authentication
code.

The configuration needs to include: - PostgreSQL connection details - A
strong JWT secret - The frontend origin used by the CORS configuration

For a local setup, the database values will usually point to `localhost`
and port `5432`. The frontend origin must match the actual Vite address
shown in the frontend terminal.

**Do not commit `.env` files or share database passwords and JWT
secrets.**

### 4. Install and start the backend

``` bash
cd backend
npm install
npm run dev
```

The API is configured to run at:

``` text
http://localhost:5000
```

Check the health endpoint:

``` text
http://localhost:5000/api/health
```

A successful response confirms that the API can connect to the database.

### 5. Install and start the frontend

Open a second terminal:

``` bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal. It is commonly:

``` text
http://localhost:5173
```

If Vite selects a different port, use the URL it prints and make sure
the backend CORS origin is configured to match it.

## Main API routes

All routes are prefixed with `http://localhost:5000/api`.

  Area              Route
  ----------------- ------------------
  Authentication    `/auth`
  Customers         `/customers`
  Leads             `/leads`
  Opportunities     `/opportunities`
  Follow-ups        `/followups`
  Activities        `/activities`
  Users and roles   `/users`
  Audit logs        `/audit-logs`
  Reports           `/reports`

Most business routes require an authenticated session. User
administration and audit log access are restricted by role. Reports are
available to Admin and Manager roles.

## User roles

The application uses three roles:

-   **Admin:** Administrative access, including user management and
    audit logs.
-   **Manager:** Access to management-level CRM information and reports.
-   **Sales Executive:** Access to assigned sales work, subject to the
    permissions enforced by the API.

## Notes

-   The backend uses PostgreSQL as its data store.
-   Passwords are hashed before they are stored.
-   The frontend sends API requests to the backend with credentials
    enabled.
-   Keep the backend and frontend running in separate terminals during
    local development.
-   Use test accounts and sample records while developing. Avoid using
    real customer information in a local test database.
-   Before deploying, configure production secrets, HTTPS, database
    backups, allowed CORS origins and appropriate access controls.

## Current project scope

The application currently includes the CRM modules listed above. Some
advanced workflows, such as a dedicated lead-to-customer conversion
process, complete password-reset delivery, token revocation on logout
and expanded report filtering/export options, may require additional
implementation and testing before production use.
