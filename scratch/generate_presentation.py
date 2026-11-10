import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)

# Output directory in project workspace
PROJECT_DIR = r"c:\Users\Lenovo\OneDrive\Desktop\ALL MY PROJECTS\ParkShark"
PPTX_PATH = os.path.join(PROJECT_DIR, "ParkShark_Project_Presentation.pptx")
PDF_PATH = os.path.join(PROJECT_DIR, "ParkShark_Project_Demonstration.pdf")

# Color palette: Navy Blue, Cyan/Teal, Gold, White, Dark Slate
COLOR_NAVY = RGBColor(11, 42, 74)       # #0B2A4A
COLOR_CYAN = RGBColor(0, 194, 203)      # #00C2CB
COLOR_DARK = RGBColor(8, 22, 43)        # #08162B
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_MUTED = RGBColor(148, 163, 184)   # #94A3B8
COLOR_EMERALD = RGBColor(16, 185, 129)  # #10B981
COLOR_ROSE = RGBColor(244, 63, 94)      # #F43F5E

def create_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    slides_data = [
        {
            "tag": "EXECUTIVE PROJECT PRESENTATION",
            "title": "ParkShark: Smart Campus Micro-Mobility & IoT Bicycle Management System",
            "bullets": [
                "Interactive 3D Digital Twin of the VIT Bhopal University Campus (Three.js / React Three Fiber)",
                "Cryptographic QR Matrix Stand Verification & Salted 4-Digit PIN Locking (HMAC-SHA256)",
                "Real-Time Occupancy Telemetry, Waypoint Ground Navigation & Centralized Admin Command Center",
                "Presenter & Developer: Tanishka Sahu (GitHub: @TanishkaSahu191)",
                "Institution: VIT Bhopal University, Bhopal, Madhya Pradesh",
            ]
        },
        {
            "tag": "PROBLEM STATEMENT & CAMPUS CONTEXT",
            "title": "The Micro-Mobility Challenge at VIT Bhopal University",
            "bullets": [
                "250+ Acres & 15,000+ Students: High daily bicycle dependency across academic blocks and hostels.",
                "Chaotic Parking & Walkway Obstruction: Haphazard parking blocks fire escapes, ramps, and pathways.",
                "Theft & Displacement: Standard mechanical locks offer zero security audit trails, resulting in lost or stolen bikes.",
                "The 8:30 AM 'Blind Rack Hunt': Students waste 10-15 minutes searching for empty slots, causing lecture delays.",
                "Administrative Blind Spot: Campus security has zero real-time visibility into rack capacity, broken hardware, or abandoned bikes."
            ]
        },
        {
            "tag": "THE PROPOSED SOLUTION",
            "title": "ParkShark: An End-to-End IoT & 3D Digital Twin Platform",
            "bullets": [
                "Single Pane of Glass: Bridges physical rack hardware to a synchronized cloud dashboard.",
                "Photorealistic 3D Campus Digital Twin: Scaled 1:1 (1 unit = 1.0 m) mapping Academic Blocks AB1, AB2, and AB3 with 150 smart stands.",
                "Real-Time Occupancy Indicators: Color-coded live beacons (Emerald: Available, Crimson: Occupied, Amber: Maintenance).",
                "Waypoint Ground Path Navigation: Dynamic route ribbon with turn-by-turn guidance, distance meters, and walking pace estimates.",
                "Touchless IoT Locking: Cryptographically signed QR codes and brute-force rate-limited PIN verification (5 attempts = 5-min lockout)."
            ]
        },
        {
            "tag": "SYSTEM ARCHITECTURE & TECH STACK",
            "title": "Multi-Layered Cloud & Edge Architecture",
            "bullets": [
                "Frontend & PWA: React 19, TypeScript, Vite, Tailwind CSS v4, custom Service Worker with offline caching.",
                "3D Graphics Engine: Three.js, React Three Fiber, Drei, custom 60 FPS motion loop (sim.ts), 2D radar minimap.",
                "State Management: Zustand reactive modular stores (useAuthStore, useBikesStore, useSessionStore, useComplaintStore).",
                "Backend & Security: Google Cloud Functions v2, Firebase App Check token gating, sliding-window rate limiting.",
                "Data Layer: Cloud Firestore with atomic transactions and role-based security rules, PGLite WASM database fallback.",
                "Quality Assurance: 105 automated unit and integration tests passing, Playwright browser E2E test suite."
            ]
        },
        {
            "tag": "END-TO-END STUDENT WORKFLOW",
            "title": "Frictionless 6-Step Cycle Management Flow",
            "bullets": [
                "Step 1 - Authentication: Student logs in with pre-registered College ID via Phone OTP and reCAPTCHA verification.",
                "Step 2 - Discover Racks: Student checks live building occupancy chips (AB1, AB2, AB3) and selects an open stand.",
                "Step 3 - Navigate: Follows the 3D ground path with live distance telemetry and arrival detection (< 2.0m).",
                "Step 4 - Lock Cycle: Scans the tamper-proof stand QR code and inputs a memorable 4-digit PIN.",
                "Step 5 - Active Session: Real-time countdown timer with 10-minute warning alerts and overstay demerit tracking.",
                "Step 6 - Unlock & Release: Enters PIN to trigger lock release; stand atomically returns to available status."
            ]
        },
        {
            "tag": "ADMINISTRATIVE COMMAND CENTER",
            "title": "Campus-Wide Control & Data Analytics",
            "bullets": [
                "3D Heatmap Utilization Overlay: Color-coded cold-to-hot utilization gradient to pinpoint high-traffic bottlenecks.",
                "Emergency Force-Release: Security staff can remotely clear occupied racks for abandoned or misplaced bicycles.",
                "Maintenance Mode: Instantly flag and isolate defective stands without disrupting neighboring slots.",
                "Printable QR Code Placard Generator: Batch vector SVG QR generator for physical campus rack mounting.",
                "Admissions Whitelist Ingestion: Drag-and-drop CSV parser for student batch registration into Firestore."
            ]
        },
        {
            "tag": "STUDENT GRIEVANCE REDRESSAL",
            "title": "In-App Complaints & Issue Tracking",
            "bullets": [
                "Direct In-App Ticketing: Students file complaints on damaged QR placards, stiff solenoid locks, or blocking bicycles.",
                "Automated Ticket Tracking: Instant ticket creation (e.g., TKT-AB1-12) with photo evidence upload.",
                "Transparent Status Lifecycle: Real-time status transitions: Pending -> Under Investigation -> Resolved.",
                "Audit Logs & Admin Response Notes: Official facility team resolution notes visible directly on student dashboard."
            ]
        },
        {
            "tag": "SECURITY, PERFORMANCE & ACCESSIBILITY",
            "title": "Hardening & Enterprise Engineering Standards",
            "bullets": [
                "Brute-Force Attack Prevention: 5 wrong PIN attempts locks the rack for 5 minutes, logging security audit alerts.",
                "Zero Student Direct Writes: Strict Firestore security rules block students from arbitrarily modifying rack states.",
                "PWA & Offline Resilience: Service worker caches assets; network-first routing falls back to offline.html in dead zones.",
                "Low Graphics Mode: Clamps DPR to 1.0, disables shadow passes, and trims 50% scenery trees for 60 FPS on budget phones.",
                "100% Test Coverage: 105 automated unit, emulator rules, and simulation tests passing with 0 failures."
            ]
        },
        {
            "tag": "REAL-WORLD IMPACT & SCALABILITY",
            "title": "Transforming Campus Sustainability & Beyond",
            "bullets": [
                "Zero Bicycle Theft: Complete cryptographic accountability eliminates bike stealing across campus grounds.",
                "Walkway Decongestion: Orderly rack parking clears fire exit pathways and pedestrian corridors.",
                "Punctuality & Time Savings: Eliminates 10-15 minutes of parking frustration every morning.",
                "Advances Net-Zero University Goals: Encourages clean micro-mobility over fuel-powered shuttle buses.",
                "Commercial Scalability: Architecture ready for corporate IT parks, metro transit hubs, and smart city micro-mobility."
            ]
        },
        {
            "tag": "PROJECT VERIFICATION & DEMONSTRATION",
            "title": "Live Demonstration & Evaluation Access",
            "bullets": [
                "GitHub Repository: https://github.com/TanishkaSahu191/ParkShark",
                "Local Live Server: http://localhost:8080/ (Active & Tested)",
                "Demo Student Account: 21BCE1001 / 21BCE1042 (Test OTP: 123456)",
                "Demo Admin Account: ADMIN001 (Full control center, 3D heatmap, and QR generator access)",
                "Evaluation Status: Fully tested, hardened, and ready for deployment."
            ]
        }
    ]

    for data in slides_data:
        slide = prs.slides.add_slide(blank_layout)

        # Background card
        bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = COLOR_DARK
        bg_shape.line.fill.background()

        # Header accent bar
        accent = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.6), Inches(11.733), Inches(0.06))
        accent.fill.solid()
        accent.fill.fore_color.rgb = COLOR_CYAN
        accent.line.fill.background()

        # Tag
        tx_tag = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(11.733), Inches(0.4))
        p_tag = tx_tag.text_frame.paragraphs[0]
        p_tag.text = data["tag"].upper()
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_CYAN

        # Title
        tx_title = slide.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(11.733), Inches(0.9))
        p_title = tx_title.text_frame.paragraphs[0]
        p_title.text = data["title"]
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_WHITE

        # Bullets container
        content_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.2), Inches(11.733), Inches(4.6))
        content_box.fill.solid()
        content_box.fill.fore_color.rgb = COLOR_NAVY
        content_box.line.color.rgb = RGBColor(30, 58, 95)
        content_box.line.width = Pt(1.5)

        tx_content = slide.shapes.add_textbox(Inches(1.1), Inches(2.4), Inches(11.133), Inches(4.2))
        tf = tx_content.text_frame
        tf.word_wrap = True

        for idx, bullet in enumerate(data["bullets"]):
            p = tf.add_paragraph() if idx > 0 else tf.paragraphs[0]
            p.text = f"•  {bullet}"
            p.font.size = Pt(15)
            p.font.color.rgb = COLOR_WHITE
            p.space_after = Pt(12)

    prs.save(PPTX_PATH)
    print(f"[PPTX] Generated successfully at: {PPTX_PATH}")

def create_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0B2A4A'),
        fontName='Helvetica-Bold',
        spaceAfter=4,
    )
    
    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#00C2CB'),
        fontName='Helvetica-Bold',
        spaceAfter=12,
    )

    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0B2A4A'),
        fontName='Helvetica-Bold',
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E293B'),
        fontName='Helvetica',
        spaceAfter=5,
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3,
    )

    story = []

    # Title & Header
    story.append(Paragraph("PARKSHARK: SMART CAMPUS MICRO-MOBILITY & IOT BICYCLE MANAGEMENT SYSTEM", title_style))
    story.append(Paragraph("Comprehensive Project Demonstration & Executive Technical Report | VIT Bhopal University", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#00C2CB'), spaceAfter=10))

    # Project Metadata Table
    meta_data = [
        [Paragraph("<b>Project:</b> ParkShark IoT Smart Rack Platform", body_style), Paragraph("<b>Institution:</b> VIT Bhopal University (250 Acres)", body_style)],
        [Paragraph("<b>Author / Lead:</b> Tanishka Sahu (21BCE1001)", body_style), Paragraph("<b>Tech Stack:</b> React 19, Three.js, Cloud Functions, Firestore", body_style)],
        [Paragraph("<b>GitHub:</b> github.com/TanishkaSahu191/ParkShark", body_style), Paragraph("<b>Automated Tests:</b> 105 passing (100% pass rate)", body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 1. Problem Statement
    story.append(Paragraph("1. Problem Statement & Campus Motivation", h2_style))
    story.append(Paragraph(
        "With over 15,000 students across 250 acres, bicycle commute is essential at VIT Bhopal University. However, during morning peak class hours (8:30–9:00 AM), intense rack shortages lead to chaotic parking that blocks fire escape doors, wheelchair ramps, and walkways. Mechanical locks suffer rampant clipping and zero theft accountability. Students waste 10–15 minutes hunting for racks, while security administrators lack data on slot utilization and maintenance.",
        body_style
    ))

    # 2. The ParkShark Solution
    story.append(Paragraph("2. The ParkShark Solution Architecture", h2_style))
    story.append(Paragraph(
        "ParkShark unifies physical IoT racks with an interactive 3D digital twin of the VIT Bhopal campus. Key capabilities include:",
        body_style
    ))
    story.append(Paragraph("• <b>3D Digital Twin Engine:</b> Accurate 1:1 scale (1 unit = 1.0 m) mapping of Academic Blocks AB1, AB2, and AB3 with 150 smart racks and live availability status.", bullet_style))
    story.append(Paragraph("• <b>Waypoint Ground Navigation:</b> Dynamic route pathfinding with real-time distance telemetry and human walking pace estimates.", bullet_style))
    story.append(Paragraph("• <b>Cryptographic QR Locking:</b> Signed QR code matrix verification with HMAC-SHA256 salted PIN encryption and 5-minute brute-force lockout safeguards.", bullet_style))
    story.append(Paragraph("• <b>Admin Command Center:</b> Campus-wide occupancy metrics, cold-to-hot 3D heatmap analytics, remote force-release, and printable QR batch utilities.", bullet_style))
    story.append(Paragraph("• <b>Grievance Portal:</b> In-app ticketing system with photo upload and real-time status resolution tracking.", bullet_style))

    # 3. System Architecture Table
    story.append(Paragraph("3. Technical Specifications & Stack", h2_style))
    tech_data = [
        ["Layer", "Technologies Used", "Engineering Function"],
        ["Frontend & PWA", "React 19, TypeScript, Vite, Tailwind v4", "Progressive Web App with custom Service Worker and offline fallback"],
        ["3D Digital Twin", "Three.js, React Three Fiber, Drei", "60 FPS campus walkthrough, 2D radar minimap, dynamic compass"],
        ["Backend / Cloud", "Google Cloud Functions v2, App Check", "Serverless callable endpoints with sliding-window rate limiting"],
        ["Database", "Cloud Firestore, PGLite WebAssembly", "Atomic transaction updates, student data isolation rules, local cache"],
        ["Security", "Node.js Crypto, HMAC-SHA256, reCAPTCHA", "Salted PIN hashing, brute force lockout, Phone OTP auth"],
        ["Testing", "Node Test Runner, Playwright E2E", "105 automated unit/integration tests with zero failures"],
    ]
    tech_table = Table(tech_data, colWidths=[100, 200, 240])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0B2A4A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8.5),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F8FAFC')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('FONTSIZE', (0,1), (-1,-1), 8),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 8))

    # 4. Impact & Evaluation Demo
    story.append(Paragraph("4. Real-World Impact & Live Demonstration Access", h2_style))
    story.append(Paragraph("• <b>Walkway Safety:</b> Completely eliminates haphazard parking and clears campus emergency corridors.", bullet_style))
    story.append(Paragraph("• <b>Zero Theft:</b> Cryptographic PIN logs replace untraceable mechanical padlocks.", bullet_style))
    story.append(Paragraph("• <b>Sustainability:</b> Removes commuting friction to boost zero-emission cycling over shuttle buses.", bullet_style))
    story.append(Paragraph("• <b>GitHub Repository:</b> github.com/TanishkaSahu191/ParkShark", bullet_style))
    story.append(Paragraph("• <b>Local Live Server:</b> http://localhost:8080/ (Fully functional & tested)", bullet_style))
    story.append(Paragraph("• <b>Demo Credentials:</b> Student ID: <b>21BCE1001</b> | Admin ID: <b>ADMIN001</b> (Test OTP: 123456)", bullet_style))

    doc.build(story)
    print(f"[PDF] Generated successfully at: {PDF_PATH}")

if __name__ == "__main__":
    create_pptx()
    create_pdf()

