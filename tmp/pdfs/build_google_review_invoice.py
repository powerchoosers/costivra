from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "costivra-google-verification-sample-invoice.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

font_dir = Path(
    r"C:\Users\lewis\.cache\codex-runtimes\codex-primary-runtime\dependencies\fonts"
)
regular_font = "Helvetica"
bold_font = "Helvetica-Bold"

for candidate in font_dir.rglob("Inter-Regular.ttf"):
    pdfmetrics.registerFont(TTFont("Inter", str(candidate)))
    regular_font = "Inter"
    break

for candidate in font_dir.rglob("Inter-SemiBold.ttf"):
    pdfmetrics.registerFont(TTFont("Inter-Semibold", str(candidate)))
    bold_font = "Inter-Semibold"
    break


navy = colors.HexColor("#0B172A")
blue = colors.HexColor("#2563EB")
lime = colors.HexColor("#C8FF3D")
muted = colors.HexColor("#667085")
line = colors.HexColor("#E4E7EC")
soft = colors.HexColor("#F7F9FC")

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="InvoiceBody",
        parent=styles["BodyText"],
        fontName=regular_font,
        fontSize=9,
        leading=13,
        textColor=navy,
    )
)
styles.add(
    ParagraphStyle(
        name="InvoiceMuted",
        parent=styles["InvoiceBody"],
        fontSize=8,
        leading=12,
        textColor=muted,
    )
)
styles.add(
    ParagraphStyle(
        name="InvoiceLabel",
        parent=styles["InvoiceMuted"],
        fontName=bold_font,
        fontSize=7,
        leading=10,
        tracking=1.1,
        textColor=blue,
    )
)
styles.add(
    ParagraphStyle(
        name="InvoiceHeading",
        parent=styles["Heading1"],
        fontName=bold_font,
        fontSize=27,
        leading=31,
        textColor=navy,
        spaceAfter=2,
    )
)
styles.add(
    ParagraphStyle(
        name="InvoiceRight",
        parent=styles["InvoiceBody"],
        alignment=TA_RIGHT,
    )
)
styles.add(
    ParagraphStyle(
        name="InvoiceMark",
        parent=styles["InvoiceBody"],
        fontName=bold_font,
        fontSize=10,
        leading=12,
        textColor=colors.white,
        alignment=1,
    )
)


def p(text: str, style: str = "InvoiceBody") -> Paragraph:
    return Paragraph(text, styles[style])


doc = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=letter,
    rightMargin=0.62 * inch,
    leftMargin=0.62 * inch,
    topMargin=0.55 * inch,
    bottomMargin=0.55 * inch,
    title="Synthetic invoice for Costivra Google OAuth verification",
    author="Costivra",
    subject="Synthetic test data only",
)

story = []

header = Table(
    [
        [
            Table(
                [
                    [
                        Table(
                            [[p("NW", "InvoiceMark")]],
                            colWidths=[0.42 * inch],
                            rowHeights=[0.42 * inch],
                            style=TableStyle(
                                [
                                    ("BACKGROUND", (0, 0), (-1, -1), navy),
                                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                                    ("FONTNAME", (0, 0), (-1, -1), bold_font),
                                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                    ("BOX", (0, 0), (-1, -1), 0.8, navy),
                                ]
                            ),
                        ),
                        p("<b>Northwind Network Services</b><br/><font color='#667085'>Business connectivity, simplified.</font>"),
                    ]
                ],
                colWidths=[0.55 * inch, 2.9 * inch],
                style=TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 0),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ]
                ),
            ),
            Table(
                [[p("SYNTHETIC TEST DOCUMENT", "InvoiceLabel")], [p("INVOICE", "InvoiceHeading")]],
                colWidths=[2.6 * inch],
                style=TableStyle(
                    [
                        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                        ("TOPPADDING", (0, 0), (-1, -1), 0),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ]
                ),
            ),
        ]
    ],
    colWidths=[4.2 * inch, 2.55 * inch],
    style=TableStyle(
        [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]
    ),
)
story.extend([header, Spacer(1, 0.32 * inch)])

banner = Table(
    [[p("DEMO ONLY", "InvoiceLabel"), p("This invoice is synthetic and contains no real customer, vendor, payment, or account information.", "InvoiceMuted")]],
    colWidths=[0.95 * inch, 5.8 * inch],
    style=TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3FFE1")),
            ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#B7E831")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]
    ),
)
story.extend([banner, Spacer(1, 0.3 * inch)])

address = Table(
    [
        [
            p("BILL TO", "InvoiceLabel"),
            p("INVOICE DETAILS", "InvoiceLabel"),
        ],
        [
            p("<b>Costivra Verification Workspace</b><br/>100 Demo Avenue<br/>Austin, TX 78701<br/>verification@costivra.ai"),
            Table(
                [
                    [p("Invoice number", "InvoiceMuted"), p("DEMO-2026-0826", "InvoiceRight")],
                    [p("Invoice date", "InvoiceMuted"), p("August 26, 2026", "InvoiceRight")],
                    [p("Due date", "InvoiceMuted"), p("September 25, 2026", "InvoiceRight")],
                    [p("Account", "InvoiceMuted"), p("TEST-4821", "InvoiceRight")],
                ],
                colWidths=[1.15 * inch, 1.55 * inch],
                style=TableStyle(
                    [
                        ("LINEBELOW", (0, 0), (-1, -2), 0.5, line),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ]
                ),
            ),
        ],
    ],
    colWidths=[3.85 * inch, 2.9 * inch],
    style=TableStyle(
        [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
    ),
)
story.extend([address, Spacer(1, 0.28 * inch)])

line_items = [
    [p("DESCRIPTION", "InvoiceLabel"), p("PERIOD", "InvoiceLabel"), p("QTY", "InvoiceLabel"), p("RATE", "InvoiceLabel"), p("AMOUNT", "InvoiceLabel")],
    [p("Managed business internet - 1 Gbps"), p("Aug 1 - Aug 31", "InvoiceMuted"), p("1", "InvoiceRight"), p("$489.00", "InvoiceRight"), p("$489.00", "InvoiceRight")],
    [p("Static IP address block"), p("Aug 1 - Aug 31", "InvoiceMuted"), p("1", "InvoiceRight"), p("$42.00", "InvoiceRight"), p("$42.00", "InvoiceRight")],
    [p("Network monitoring add-on"), p("Aug 1 - Aug 31", "InvoiceMuted"), p("1", "InvoiceRight"), p("$85.00", "InvoiceRight"), p("$85.00", "InvoiceRight")],
    [p("Service activation credit"), p("One time", "InvoiceMuted"), p("1", "InvoiceRight"), p("-$50.00", "InvoiceRight"), p("-$50.00", "InvoiceRight")],
]

items_table = Table(line_items, colWidths=[2.75 * inch, 1.35 * inch, 0.55 * inch, 0.85 * inch, 1.25 * inch], repeatRows=1)
items_table.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), navy),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBELOW", (0, 1), (-1, -1), 0.6, line),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, soft]),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]
    )
)
story.extend([items_table, Spacer(1, 0.25 * inch)])

totals = Table(
    [
        [p("<font color='#2563EB'><b>NOTES</b></font><br/><br/>Synthetic invoice created only to demonstrate read-only Gmail attachment intake during Google verification.", "InvoiceMuted"), p("Subtotal", "InvoiceMuted"), p("$566.00", "InvoiceRight")],
        ["", p("Tax", "InvoiceMuted"), p("$46.70", "InvoiceRight")],
        ["", p("AMOUNT DUE", "InvoiceLabel"), p("<b>$612.70</b>", "InvoiceRight")],
    ],
    colWidths=[3.75 * inch, 1.35 * inch, 1.65 * inch],
    style=TableStyle(
        [
            ("SPAN", (0, 0), (0, 2)),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEABOVE", (1, 2), (-1, 2), 1.2, navy),
            ("BACKGROUND", (1, 2), (-1, 2), colors.HexColor("#F3FFE1")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]
    ),
)
story.extend([totals, Spacer(1, 0.34 * inch)])

footer = Table(
    [[p("Northwind Network Services - synthetic demonstration vendor", "InvoiceMuted"), p("No payment is requested or accepted.", "InvoiceRight")]],
    colWidths=[4.25 * inch, 2.5 * inch],
    style=TableStyle(
        [
            ("LINEABOVE", (0, 0), (-1, 0), 0.7, line),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
        ]
    ),
)
story.append(footer)

doc.build(story)
print(OUTPUT)
