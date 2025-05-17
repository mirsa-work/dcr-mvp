require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Core utilities
const { errorHandler, ModuleRegistry } = require('./utils/core');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Discover and register modules
ModuleRegistry.discoverModules(path.join(__dirname, 'modules'));

// If modules aren't auto-discovered, register them manually
if (Object.keys(ModuleRegistry.modules).length === 0) {
    // Users module (authentication)
    const usersModule = require('./modules/users');
    ModuleRegistry.register(usersModule.name, usersModule);
    
    // Branches module
    const branchesModule = require('./modules/branches');
    ModuleRegistry.register(branchesModule.name, branchesModule);
    
    // DCR module
    const dcrModule = require('./modules/dcr');
    ModuleRegistry.register(dcrModule.name, dcrModule);
}

// Register routes from all modules
ModuleRegistry.getRoutes().forEach(route => {
    app[route.method](
        route.path,
        ...route.middleware,
        route.handler
    );
});

// Health check endpoint
app.get('/health', (_, res) => res.json({ status: 'OK' }));

// Global error handler
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Registered modules: ${Object.keys(ModuleRegistry.modules).join(', ')}`);
});
