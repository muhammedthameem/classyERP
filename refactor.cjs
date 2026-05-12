const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const appPath = path.join(srcDir, 'App.jsx');
const content = fs.readFileSync(appPath, 'utf8');

// Ensure directories exist
const dirs = [
    'pages/Overview', 'pages/Clients', 'pages/Orders', 'pages/Inventory', 
    'pages/Sales', 'pages/Users', 'pages/Reports', 'components', 'utils'
];
dirs.forEach(d => {
    const fullPath = path.join(srcDir, d);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

function extractBlock(startIndex) {
    let braceCount = 0;
    let i = startIndex;
    let started = false;
    let inString = false;
    let quoteChar = '';
    let bodyStarted = false;

    // First, find the end of the parameter list ')' and the start of the body '{'
    let paramBraceCount = 0;
    let foundBodyStart = false;
    
    while (i < content.length) {
        const char = content[i];
        if (char === '(') paramBraceCount++;
        else if (char === ')') paramBraceCount--;
        
        if (paramBraceCount === 0 && char === '{') {
            foundBodyStart = true;
            break;
        }
        i++;
    }

    if (!foundBodyStart) return null;

    // Now count braces for the body
    i = i; // Reset to where the '{' was found
    while (i < content.length) {
        const char = content[i];
        
        if (!inString) {
            if (char === '"' || char === "'" || char === "`") {
                inString = true;
                quoteChar = char;
            } else if (char === '{') {
                braceCount++;
                started = true;
            } else if (char === '}') {
                braceCount--;
            }
        } else {
            if (char === quoteChar && content[i-1] !== '\\') {
                inString = false;
            }
        }

        if (started && braceCount === 0) {
            return content.substring(startIndex, i + 1);
        }
        i++;
    }
    return null;
}

function getFunction(name) {
    const regex = new RegExp(`function\\s+${name}\\s*\\(`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
        // Simple check to see if it's the top level function declaration
        const lineStart = content.lastIndexOf('\n', match.index) + 1;
        const line = content.substring(lineStart, match.index + name.length + 10);
        if (line.startsWith('function ' + name)) {
            return extractBlock(match.index);
        }
    }
    return null;
}

const lucideIcons = [
    'Bell', 'CalendarDays', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
    'ChevronsLeft', 'ChevronsRight', 'CircleDollarSign', 'ClipboardList',
    'Crown', 'Gem', 'LayoutDashboard', 'LogOut', 'Menu', 'Moon', 'Package',
    'Palette', 'Search', 'Settings', 'ShieldCheck', 'ShoppingBag', 'Sparkles',
    'Sun', 'TrendingUp', 'UsersRound', 'Eye', 'Pencil', 'Trash2', 'Download',
    'ShoppingCart', 'CheckCircle', 'Clock', 'Play', 'Pause', 'CheckCircle2',
    'BarChart3'
];

// 3. Pages
const pageMap = {
    CreateUserPage: 'pages/Users/CreateUser',
    ViewUsersPage: 'pages/Users/ViewUsers',
    AddClientsPage: 'pages/Clients/AddClients',
    ViewClientsPage: 'pages/Clients/ViewClients',
    ClientDetailPage: 'pages/Clients/ClientDetail',
    AddOrderPage: 'pages/Orders/AddOrder',
    ViewOrdersPage: 'pages/Orders/ViewOrders',
    CreateInventoryPage: 'pages/Inventory/CreateInventory',
    ViewInventoryPage: 'pages/Inventory/ViewInventory',
    InventoryDetailPage: 'pages/Inventory/InventoryDetail',
    CreateSalesPage: 'pages/Sales/CreateSales',
    ViewSalesPage: 'pages/Sales/ViewSales',
    ReportsPage: 'pages/Reports/Reports'
};

function generateFile(name, relPath, extraImports = []) {
    console.log(`Extracting ${name}...`);
    const code = getFunction(name);
    if (!code) {
        console.error(`Could not find function ${name}`);
        return;
    }

    let imports = ["import React, { useState, useEffect, useRef } from 'react'"];
    
    const usedIcons = lucideIcons.filter(icon => code.includes(icon));
    if (usedIcons.length > 0) {
        imports.push(`import { ${usedIcons.join(', ')} } from 'lucide-react'`);
    }

    if (code.includes('html2pdf')) {
        imports.push("import html2pdf from 'html2pdf.js'");
    }

    const depth = relPath.split('/').length;
    const dots = '../'.repeat(depth - 1);

    const constants = [
        'formatDateDDMMYY', 'getIndianDate', 'formatDateTimeDDMMYY', 'boutiqueThemes',
        'appearanceTokens', 'navItems', 'stats', 'orders', 'products', 'staffActivities'
    ];
    const usedConstants = constants.filter(c => code.includes(c));
    if (usedConstants.length > 0) {
        imports.push(`import { ${usedConstants.join(', ')} } from '${dots}utils/constants'`);
    }

    // Add component imports if they are used
    const components = ['CustomDatePicker', 'ReportStatCard'];
    components.forEach(comp => {
        if (code.includes(`<${comp}`) && name !== comp) {
            const compPath = componentMap[comp] || `components/${comp}`;
            const targetDepth = compPath.split('/').length;
            // Simplified: everything is in components/ for now
            const compDots = '../'.repeat(depth - 1) + 'components/';
            imports.push(`import ${comp} from '${compDots}${comp}'`);
        }
    });

    // Add page imports if they are used
    Object.entries(pageMap).forEach(([pName, pPath]) => {
        if (code.includes(`<${pName}`) && name !== pName) {
            imports.push(`import ${pName} from '${dots}${pPath}'`);
        }
    });

    const finalContent = imports.join('\n') + '\n\n' + code + `\n\nexport default ${name};\n`;
    fs.writeFileSync(path.join(srcDir, relPath + '.jsx'), finalContent);
}
// 1. Constants
console.log("Extracting constants...");
// Match from the first constant to the last staffActivities
const constantsEndIndex = content.indexOf('function App()');
const constantsCodeRaw = content.substring(0, constantsEndIndex).trim();

// Remove the initial imports
const firstConstIndex = constantsCodeRaw.search(/const |function /);
let constantsCode = constantsCodeRaw.substring(firstConstIndex);

// Export top-level const and function
constantsCode = constantsCode.replace(/^const /gm, 'export const ');
constantsCode = constantsCode.replace(/^function /gm, 'export function ');

const constantsFileContent = "import { " + lucideIcons.join(', ') + " } from 'lucide-react'\n\n" + constantsCode;
fs.writeFileSync(path.join(srcDir, 'utils/constants.js'), constantsFileContent);

// 2. Components
const componentMap = {
    LoginScreen: 'components/LoginScreen',
    Dashboard: 'components/Dashboard',
    AccountDetailsModal: 'components/AccountDetailsModal',
    CustomDatePicker: 'components/CustomDatePicker',
    ReportStatCard: 'components/ReportStatCard'
};
Object.entries(componentMap).forEach(([name, path]) => generateFile(name, path));
Object.entries(pageMap).forEach(([name, path]) => generateFile(name, path));

// 4. Update App.jsx
console.log("Updating App.jsx...");
const appCode = getFunction('App');

// Generate all page imports
const pageImports = Object.entries(pageMap).map(([name, relPath]) => `import ${name} from './${relPath}'`).join('\n');

const appFileContent = `import React, { useState } from 'react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
${pageImports}

${appCode}

export default App;
`;
fs.writeFileSync(appPath, appFileContent);

console.log("Refactoring complete!");
