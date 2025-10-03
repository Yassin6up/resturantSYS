#!/usr/bin/env node

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BRANCH_CODE = 'CAS';
const OUTPUT_DIR = './qr-codes';

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate QR codes for tables
async function generateTableQRCodes() {
  console.log('🔄 Generating QR codes for tables...');
  
  const tables = [];
  
  // Generate indoor tables (T1-T20)
  for (let i = 1; i <= 20; i++) {
    tables.push({
      number: `T${i}`,
      description: `Table ${i} - Indoor`,
      url: `${BASE_URL}/menu?table=T${i}&branch=${BRANCH_CODE}`
    });
  }
  
  // Generate outdoor tables (T21-T25)
  for (let i = 21; i <= 25; i++) {
    tables.push({
      number: `T${i}`,
      description: `Table ${i} - Outdoor Terrace`,
      url: `${BASE_URL}/menu?table=T${i}&branch=${BRANCH_CODE}`
    });
  }
  
  // Generate QR codes
  for (const table of tables) {
    try {
      const qrCodeBuffer = await QRCode.toBuffer(table.url, {
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      const filename = `table-${table.number}-qr.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      fs.writeFileSync(filepath, qrCodeBuffer);
      
      console.log(`✅ Generated QR code for ${table.number}: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to generate QR code for ${table.number}:`, error.message);
    }
  }
  
  return tables;
}

// Generate HTML page with all QR codes
async function generateQRCodeSheet(tables) {
  console.log('📄 Generating QR code sheet...');
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POSQ Table QR Codes</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .qr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .qr-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .qr-card img {
            max-width: 100%;
            height: auto;
            margin-bottom: 10px;
        }
        .table-info {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .table-description {
            font-size: 0.9em;
            color: #666;
        }
        .instructions {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #2196f3;
        }
        @media print {
            body { background-color: white; }
            .qr-grid { grid-template-columns: repeat(4, 1fr); }
            .qr-card { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍽️ POSQ Restaurant POS</h1>
        <h2>Table QR Codes - ${BRANCH_CODE} Branch</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="instructions">
        <h3>📱 Instructions for Customers:</h3>
        <ol>
            <li>Open your phone's camera app</li>
            <li>Point the camera at the QR code on your table</li>
            <li>Tap the notification that appears</li>
            <li>Browse the menu and place your order</li>
        </ol>
    </div>
    
    <div class="qr-grid">
        ${tables.map(table => `
            <div class="qr-card">
                <img src="table-${table.number}-qr.png" alt="QR Code for ${table.number}">
                <div class="table-info">${table.number}</div>
                <div class="table-description">${table.description}</div>
            </div>
        `).join('')}
    </div>
    
    <div style="text-align: center; margin-top: 30px; color: #666;">
        <p>POSQ Restaurant POS System - Table QR Codes</p>
        <p>Base URL: ${BASE_URL}</p>
    </div>
</body>
</html>`;
  
  const htmlPath = path.join(OUTPUT_DIR, 'qr-codes-sheet.html');
  fs.writeFileSync(htmlPath, html);
  
  console.log(`✅ Generated QR code sheet: ${htmlPath}`);
}

// Main function
async function main() {
  console.log('🚀 POSQ QR Code Generator');
  console.log('========================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Branch: ${BRANCH_CODE}`);
  console.log(`Output Directory: ${OUTPUT_DIR}`);
  console.log('');
  
  try {
    const tables = await generateTableQRCodes();
    await generateQRCodeSheet(tables);
    
    console.log('');
    console.log('🎉 QR code generation complete!');
    console.log(`📁 Files saved to: ${OUTPUT_DIR}`);
    console.log('📄 Open qr-codes-sheet.html in your browser to view all QR codes');
    console.log('');
    console.log('💡 Tips:');
    console.log('- Print the HTML file for physical QR code sheets');
    console.log('- Laminate the QR codes for durability');
    console.log('- Place QR codes on table stands or menus');
    
  } catch (error) {
    console.error('❌ Error generating QR codes:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateTableQRCodes, generateQRCodeSheet };