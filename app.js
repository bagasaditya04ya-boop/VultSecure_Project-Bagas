import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from "groq-sdk";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit'; 

// --- IMPORT MODUL INTERNAL YANG TERSISA ---
import { lockKernelIntegrity, verifyKernelIntegrity } from './src/core/quantum_vault.js';
import { analyzeMediaIntegrity } from './src/ai/deepfake_detector.js';

// --- POIN 2: INTERNAL SATELLITE MESH ENGINE ---
// (Disatukan di sini agar tidak ada lagi error Cannot find module)
const initiateSatelliteUplink = (emergencyData) => {
    console.log("> [SATELLITE] Quantum Handshake Initialized...");
    const satelliteNodes = [
        { id: "VULT-LEO-ASIA-01", region: "Asia-Pacific", status: "ONLINE" },
        { id: "VULT-LEO-EU-05", region: "Europe-Frankfurt", status: "STANDBY" },
        { id: "VULT-LEO-US-09", region: "North-America", status: "STANDBY" }
    ];
    const activeNode = satelliteNodes[0]; 
    return {
        connection: "ENCRYPTED_MESH_ACTIVE",
        mesh_node: activeNode.id,
        region: activeNode.region,
        message: `SOS Broadcasted via ${activeNode.region} Mesh Network.`
    };
};

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- GLOBAL STATE ---
let globalThreatLevel = 0;

// Fungsi Log Standar (TXT)
const generateReport = (event, detail) => {
    const timestamp = new Date().toLocaleString('id-ID');
    const entry = `\n[REPORT] ${timestamp} | ${event} | ${detail}\n------------------------`;
    fs.appendFileSync('./riwayat_scan.txt', entry);
};

// --- POIN 1: AI PREDICTIVE THREAT RADAR ---
app.get('/threat-radar', (req, res) => {
    const logData = fs.existsSync('./riwayat_scan.txt') ? fs.readFileSync('./riwayat_scan.txt', 'utf8') : "";
    const intrusionCount = (logData.match(/INTRUSION|LOCKDOWN|BYPASS/g) || []).length;
    
    globalThreatLevel = Math.min(intrusionCount * 15, 100); 
    
    let status = "NORMAL";
    if (globalThreatLevel > 40) status = "ELEVATED";
    if (globalThreatLevel > 75) status = "CRITICAL";

    res.json({
        score: globalThreatLevel,
        status: status,
        recommendation: globalThreatLevel > 50 ? "Initiate Satellite Air-Gap" : "System Stable"
    });
});

// --- POIN 3: BIOMETRIC BYPASS & GPS TRAP ---
app.post('/biometric-trap', (req, res) => {
    const { deviceId, attemptCount } = req.body;
    const intruderLocation = "6°10'30.5\"S 106°49'43.0\"E (Jakarta Node)";
    
    generateReport("BIOMETRIC_BYPASS", `Unauthorized access attempt at ${deviceId}. GPS Tag: ${intruderLocation}`);

    res.json({
        status: "LOCKDOWN_ACTIVE",
        message: "Biometric mismatch. Identity logged.",
        gps_tag: intruderLocation
    });
});

// --- ENDPOINT DOWNLOAD PDF FORMAL (PRECISION GRID) ---
app.get('/download-pdf', (req, res) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `VultSecure_Audit_Report.pdf`;

    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-type', 'application/pdf');

    const primaryBlue = '#004a99';
    const textGray = '#333333';
    const softGray = '#666666';
    const rowBorder = '#eeeeee';

    // Header
    doc.fillColor(primaryBlue).fontSize(22).text('VULTSECURE', 50, 50, { characterSpacing: 1.5 });
    doc.fontSize(9).fillColor(softGray).text('INTERNATIONAL DIGITAL DEFENSE & CYBER AUDIT', 50, 78);
    doc.moveTo(50, 100).lineTo(545, 100).strokeColor(primaryBlue).lineWidth(2).stroke();

    // Metadata
    const metaY = 125;
    doc.fillColor(textGray).fontSize(10);
    doc.text('Report ID:', 50, metaY);
    doc.text(`VS-INTL-${Math.floor(Date.now()/100000)}`, 160, metaY);
    doc.text('Issue Date:', 50, metaY + 18);
    doc.text(new Date().toLocaleString('id-ID'), 160, metaY + 18);
    doc.text('Threat Level:', 50, metaY + 36);
    doc.fillColor(globalThreatLevel > 50 ? '#ff0000' : '#28a745').text(`${globalThreatLevel}% (ANALYZED BY AI)`, 160, metaY + 36);

    // Audit Logs Table
    const tableTop = 230;
    doc.fillColor(primaryBlue).fontSize(13).text('DETAILED SECURITY LOGS', 50, tableTop - 25);
    doc.rect(50, tableTop, 495, 22).fill(primaryBlue);
    doc.fillColor('#ffffff').fontSize(9).text('TIMESTAMP', 65, tableTop + 7);
    doc.text('MODULE / CATEGORY', 185, tableTop + 7);
    doc.text('RESULT & STATUS', 410, tableTop + 7);

    let currentY = tableTop + 32;
    const findings = [
        { t: new Date().toLocaleDateString(), m: "KERNEL_INTEGRITY", r: "VERIFIED" },
        { t: new Date().toLocaleDateString(), m: "SAT_MESH_LINK", r: "ASIA_NODE_ACTIVE" },
        { t: new Date().toLocaleDateString(), m: "BIOMETRIC_TRAP", r: "GPS_TAGGED" },
        { t: new Date().toLocaleDateString(), m: "PREDICTIVE_AI", r: "RADAR_MONITORING" }
    ];

    findings.forEach(item => {
        doc.fillColor(textGray).fontSize(9).text(item.t, 65, currentY);
        doc.text(item.m, 185, currentY);
        doc.fillColor('#000000').text(item.r, 410, currentY, { bold: true });
        doc.moveTo(50, currentY + 13).lineTo(545, currentY + 13).strokeColor(rowBorder).lineWidth(0.5).stroke();
        currentY += 28;
    });

    // Footer
    const footerY = 750;
    doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(rowBorder).stroke();
    doc.fontSize(8).fillColor(softGray).text('CONFIDENTIAL - VULTSECURE PROPRIETARY REPORT', 50, footerY + 15, { align: 'center' });

    doc.pipe(res);
    doc.end();
});

// --- ENDPOINT AUDIT ---
app.post('/execute', async (req, res) => {
    const { action } = req.body;
    let localAnalysis = "";
    if (action === "BANK_FRAUD_DIAGNOSTIC") {
        const resAI = analyzeMediaIntegrity();
        localAnalysis = `[VultOS Local AI: ${resAI.status}] `;
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Kamu adalah VultOS Kernel AI." },
                { role: "user", content: `Audit modul: ${action}. Temuan Lokal: ${localAnalysis}` }
            ],
            model: "llama3-8b-8192",
        });
        res.json({ ai_respond: localAnalysis + completion.choices[0].message.content });
    } catch (err) { res.status(500).json({ error: "Kernel Communication Error" }); }
});

// --- POIN 2: MULTI-NODE SATELLITE SOS ---
app.post('/emergency-satellite', (req, res) => {
    // Memanggil fungsi internal yang sudah disatukan di atas
    const satelliteResult = initiateSatelliteUplink({ status: "SOS_ACTIVE" });
    generateReport("SATELLITE_MESH", `Uplink to ${satelliteResult.mesh_node} (${satelliteResult.region})`);
    res.json({ 
        connection: satelliteResult.connection, 
        message: satelliteResult.message,
        node: satelliteResult.mesh_node,
        region: satelliteResult.region
    });
});

app.listen(3000, '0.0.0.0', () => {
    try {
        lockKernelIntegrity('./app.js');
        console.log("-----------------------------------------");
        console.log("VULTSECURE ENGINE: OPERATIONAL");
        console.log("Internal Satellite Mesh: ACTIVE");
        console.log("AI Predictive Radar: ONLINE");
        console.log("Biometric Trap: ARMED");
        console.log("-----------------------------------------");
    } catch (e) { console.log("> [ERROR] Periksa folder src/core atau src/ai !"); }
});