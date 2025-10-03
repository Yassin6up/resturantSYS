#!/usr/bin/env node

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const BRANCH_CODE = process.env.BRANCH_CODE || 'casa01';
const OUTPUT_DIR = './qr-codes';

// Table configuration
const TABLES = [
  { number: 'T01', description: 'Table 1 - Window' },
  { number: 'T02', description: 'Table 2 - Corner' },
  { number: 'T03', description: 'Table 3 - Center' },
  { number: 'T04', description: 'Table 4 - Bar' },
  { number: 'T05', description: 'Table 5 - Patio' },
  { number: 'T06', description: 'Table 6 - VIP' },
  { number: 'T07', description: 'Table 7 - Family' },
  { number: 'T08', description: 'Table 8 - Booth' },
  { number: 'T09', description: 'Table 9 - Terrace' },
  { number: 'T10', description: 'Table 10 - Private' },
  { number: 'T11', description: 'Table 11 - Garden' },
  { number: 'T12', description: 'Table 12 - Lounge' }
];

async function generateQRCodes() {
  console.log('🎯 Generating QR codes for table ordering...');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const qrCodes = [];

  for (const table of TABLES) {
    const url = `${FRONTEND_URL}/menu?table=${table.number}&branch=${BRANCH_CODE}`;
    
    try {
      // Generate QR code as data URL
      const qrDataURL = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Save individual QR code as PNG
      const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '');
      const filename = `${table.number.toLowerCase()}_qr.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      fs.writeFileSync(filepath, base64Data, 'base64');
      
      qrCodes.push({
        table: table.number,
        description: table.description,
        url: url,
        filename: filename,
        qrCode: qrDataURL
      });

      console.log(`✅ Generated QR code for ${table.number}: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to generate QR code for ${table.number}:`, error.message);
    }
  }

  // Generate HTML sheet with all QR codes
  const htmlContent = generateHTMLSheet(qrCodes);
  const htmlPath = path.join(OUTPUT_DIR, 'qr-codes-sheet.html');
  fs.writeFileSync(htmlPath, htmlContent);
  
  console.log(`📄 Generated HTML sheet: ${htmlPath}`);
  
  // Generate JSON file with QR code data
  const jsonPath = path.join(OUTPUT_DIR, 'qr-codes-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(qrCodes, null, 2));
  
  console.log(`📊 Generated JSON data: ${jsonPath}`);
  
  console.log('🎉 QR code generation completed!');
  console.log(`📁 Files saved to: ${OUTPUT_DIR}`);
  console.log('💡 Open qr-codes-sheet.html in your browser to print the QR codes');
}

function generateHTMLSheet(qrCodes) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POSQ Table QR Codes</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .header h1 {
            margin: 0;
            color: #333;
            font-size: 2.5em;
        }
        
        .header p {
            margin: 10px 0 0 0;
            color: #666;
            font-size: 1.2em;
        }
        
        .qr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .qr-card {
            border: 2px solid #333;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            page-break-inside: avoid;
        }
        
        .qr-card h2 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.5em;
        }
        
        .qr-card p {
            margin: 0 0 15px 0;
            color: #666;
            font-size: 1em;
        }
        
        .qr-code {
            margin: 15px 0;
        }
        
        .qr-code img {
            max-width: 200px;
            height: auto;
            border: 1px solid #ddd;
        }
        
        .instructions {
            font-size: 0.9em;
            color: #888;
            margin-top: 15px;
            line-height: 1.4;
        }
        
        .url {
            font-family: monospace;
            font-size: 0.8em;
            color: #666;
            word-break: break-all;
            margin-top: 10px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 10px;
            }
            
            .qr-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
            }
            
            .qr-card {
                margin-bottom: 20px;
                box-shadow: none;
            }
        }
        
        @page {
            margin: 1cm;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>POSQ Restaurant</h1>
        <p>Table QR Codes for Mobile Ordering</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="qr-grid">
        ${qrCodes.map(qr => `
            <div class="qr-card">
                <h2>${qr.table}</h2>
                <p>${qr.description}</p>
                <div class="qr-code">
                    <img src="${qr.qrCode}" alt="QR Code for ${qr.table}" />
                </div>
                <div class="instructions">
                    <strong>How to use:</strong><br>
                    1. Scan this QR code with your phone<br>
                    2. Browse our menu and add items<br>
                    3. Place your order directly<br>
                    4. Pay at the cashier or online
                </div>
                <div class="url">${qr.url}</div>
            </div>
        `).join('')}
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 0.9em;">
            Print this page and place QR codes on corresponding tables.<br>
            For support, contact your system administrator.
        </p>
    </div>
</body>
</html>
  `;
}

// Run the script
if (require.main === module) {
  generateQRCodes().catch(console.error);
}

module.exports = { generateQRCodes };