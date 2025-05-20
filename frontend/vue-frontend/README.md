# DCR MVP - Vue.js Migration

This project is a migration of the DCR MVP application from jQuery to Vue.js.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with ESLint

```sh
npm run lint
```

## Migration Progress

### Completed:
- Project structure setup
- Authentication store
- Router configuration with navigation guards
- Basic layout components
- Login view
- DCR records view (structure only)
- Reports view (structure only)
- API service for backend communication

### To Do:
- Implement DCR records functionality:
  - Load branches
  - Load DCR records
  - Create/edit DCR form
  - Status workflow
- Implement Reports functionality:
  - Load branches
  - Generate reports
  - Download PDF reports
- User management:
  - Change password
  - Reset password (admin)
- Complete test coverage
- Refine UI/UX

## API Integration

The application communicates with the backend API using the following endpoints:

- `/api/login` - Authentication
- `/api/branches` - Get branches
- `/api/branches/{branchId}/dcr` - Get DCR records by branch/month
- `/api/dcr/{id}` - Get/update DCR by ID
- `/api/form-spec` - Get form specifications
- `/api/branches/{branchId}/reports/{yearMonth}/data` - Get report data
- `/api/branches/{branchId}/reports/{yearMonth}/pdf` - Download report PDF
- `/api/change-password` - Change user password
- `/api/reset-user-password` - Reset another user's password (admin only)

## Environment Configuration

Create a `.env.local` file in the project root with:

```
VITE_API_BASE_URL=http://localhost:3000
```

Or adjust to match your backend API URL.
