from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Image, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from datetime import datetime
import os  # Required to reference the image directory
from reportlab.lib.utils import ImageReader

from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from io import BytesIO
from datetime import datetime


# Function to scale the image proportionally
def get_scaled_image(image_path, max_width=None, max_height=None):
    try:
        img_reader = ImageReader(image_path)
        img_width, img_height = img_reader.getSize()

        # If both max_width and max_height are None, return original image
        if not max_width and not max_height:
            return Image(image_path)

        # Calculate scaling factors to preserve the aspect ratio
        if max_width and max_height:
            scale_width = max_width / img_width
            scale_height = max_height / img_height
            scale = min(scale_width, scale_height)  # Use the smaller scale to fit the image
        elif max_width:
            scale = max_width / img_width
        elif max_height:
            scale = max_height / img_height

        # New dimensions after scaling
        new_width = img_width * scale
        new_height = img_height * scale

        # Return the scaled image
        return Image(image_path, width=new_width, height=new_height)
    
    except OSError:
        # Handle missing images gracefully
        return Paragraph("Image Missing")

from PIL import Image as PILImage
import requests

def get_scaled_image_from_url(image_url, max_width=None, max_height=None):
    try:
        # Fetch the image content
        response = requests.get(image_url, stream=True)
        response.raise_for_status()

        # Open the image with PIL
        img = PILImage.open(response.raw)

        # Resize the image
        img.thumbnail((max_width or img.width, max_height or img.height), PILImage.ANTIALIAS)

        # Save the image to a BytesIO buffer
        img_buffer = BytesIO()
        img.save(img_buffer, format='JPEG')
        img_buffer.seek(0)

        # Create an ImageReader from the buffer
        img_reader = ImageReader(img_buffer)

        # Return an Image object for ReportLab
        return Image(img_reader)
    except Exception as e:
        # Handle missing images gracefully
        print(f"Error fetching image: {e}")
        return Paragraph("Image Missing")


def add_page_number(canvas, doc):
    """Add page numbers in the footer."""
    page_num = canvas.getPageNumber()
    text = f"Page {page_num}"
    canvas.drawRightString(7.5 * inch, 0.75 * inch, text)  # Use inches for positioning

def add_footer(canvas, doc):
    """Add a footer to each page."""
    canvas.saveState()
    canvas.setFont('Helvetica', 9)

    # Define the horizontal position for footer and page number
    footer_x_position = 0.5 * inch
    page_number_x_position = 7.5 * inch

    # Draw the footer text
    canvas.drawString(footer_x_position, 0.5 * inch, "HTX - Confidential Report")

    # Draw the page number
    canvas.drawRightString(page_number_x_position, 0.5 * inch, f"Page {canvas.getPageNumber()}")

    canvas.restoreState()


from reportlab.lib import colors

# def get_boolean_symbol_image(is_true, image_directory):
#     """Function to return appropriate image for boolean value."""
#     danger_symbol = u'\u2715' # Warning symbol
#     safe_symbol = u'\u2713'    # Checkmark symbol
#     if is_true:
#         return safe_symbol
#         # image_path = os.path.join(image_directory, 'tick.png')  # Path to tick/check mark image
#     else:
#         return danger_symbol
#         # image_path = os.path.join(image_directory, 'danger.png')  # Path to danger symbol image

#     # return Image(image_path, width=0.25 * inch, height=0.25 * inch)  # Return scaled image

def get_boolean_symbol_image(is_true, image_directory):
    """Function to return appropriate image for boolean value."""
    danger_symbol = u'\u2715'  # Warning symbol
    safe_symbol = u'\u2713'    # Checkmark symbol

    # Define a style with a specific color
    styles = getSampleStyleSheet()
    normal_style = styles['Normal']

    if is_true:
        symbol = safe_symbol
        # Change the color to green for the safe symbol
        normal_style.textColor = colors.green
    else:
        symbol = danger_symbol
        # Change the color to red for the danger symbol
        normal_style.textColor = colors.red

    # Return the symbol wrapped in a Paragraph to apply the color
    return Paragraph(symbol, normal_style)


def generate_pdf_report(image_data):
    try:
        name_only = os.path.splitext(image_data.filename)[0]

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []

        # Define styles
        styles = getSampleStyleSheet()
        bold_style = ParagraphStyle(
            name='BoldStyle',
            fontSize=12,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold'
        )

        regular_style = ParagraphStyle(
            name='RegularStyle',
            fontSize=12,
            alignment=TA_LEFT,
            fontName='Helvetica'
        )

        cover_style = ParagraphStyle(
            name='CoverTitle',
            fontSize=24,
            alignment=TA_CENTER,
            spaceAfter=20
        )

        subheader_style = ParagraphStyle(
            name='SubHeader',
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=10
        )

        # section_title_style = ParagraphStyle(
        #     name='SectionTitle',
        #     fontSize=16,
        #     fontName='Helvetica-Bold',
        #     spaceAfter=10,
        #     alignment=TA_CENTER
        # )
        from reportlab.lib.colors import HexColor

        # Define a custom color
        corporate_blue = HexColor("#003366")

        # Update your styles
        section_title_style = ParagraphStyle(
            name='SectionTitle',
            fontSize=16,
            fontName='Helvetica-Bold',
            textColor=corporate_blue,
            spaceAfter=10,
            alignment=TA_CENTER,
            underlineWidth=1,
            underlineColor=corporate_blue,
            underlineOffset=-3
        )



        normal_style = styles['Normal']
        image_directory = os.path.join(os.getcwd(), 'app/images')
        htx_logo_path = os.path.join(image_directory, 'htx_logo.png')  # HTX logo
        scdf_logo_path = os.path.join(image_directory, 'scdf_logo.png')  # SCDF logo

        # Cover Page
        story.append(Spacer(1, 0.5 * inch))  # Space before logos
        htx_logo = get_scaled_image(htx_logo_path, max_width=1.5 * inch, max_height=1.5 * inch)
        scdf_logo = get_scaled_image(scdf_logo_path, max_width=1.5 * inch, max_height=1.5 * inch)
        logo_table = Table([[htx_logo, Spacer(1, 1 * inch), scdf_logo]], colWidths=[2.5 * inch, 1 * inch, 2.5 * inch])
        logo_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),  # Center horizontally
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')  # Center vertically
        ]))
        story.append(logo_table)
        story.append(Spacer(1, 0.5 * inch))

        # Report Title and Info
        story.append(Paragraph("Blockfinder Drone Map Report", cover_style))
        story.append(Spacer(1, 0.5 * inch))
        story.append(Paragraph(f"Report for: {name_only}", subheader_style))
        story.append(Paragraph(f"Location: {image_data.location}", subheader_style))
        story.append(Paragraph(f"Label: {image_data.label}", subheader_style))
        story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", subheader_style))
        story.append(Spacer(1, 2 * inch))
        story.append(Paragraph("Prepared by HTX", subheader_style))
        story.append(PageBreak())

        # Section 1: Map Overview
        story.append(Paragraph("Map Overview", section_title_style))
        story.append(Spacer(1, 0.5 * inch))

        if image_data.annotated_url:
            image = Image(image_data.annotated_url, width=7 * inch, height=6 * inch)
            image_table = Table([
                [Paragraph(f"Filename: {image_data.filename}", normal_style)],
                [Paragraph(f"Location: {image_data.location}", normal_style)],
                [Paragraph(f"Label: {image_data.label}", normal_style)],
                [Paragraph(f"Created At: {image_data.created_at}", normal_style)],
                [Spacer(1, 0.25 * inch)],
                [image]
            ], colWidths=[7 * inch])

            image_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),  # Center horizontally
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')  # Center vertically
            ]))

            story.append(image_table)
        story.append(PageBreak())

        # Section 2: Cropped Images Analysis
        story.append(Paragraph("Fire Access Ways Analysis", section_title_style))
        story.append(Spacer(1, 0.5 * inch))

        image_directory = os.path.join(os.getcwd(), 'app/images')  # Make sure you set the correct path
        # vehicle_symbol = get_boolean_symbol_image(cropped_image.data.get('is_vehicle', False), image_directory)

        

        for cropped_image in image_data.cropped_images:
            # Details Table
            details_data = [
                [Paragraph('Premise', bold_style), Paragraph(cropped_image.polygon.name or 'N/A', regular_style)],
                [Paragraph('Address', bold_style), Paragraph(cropped_image.polygon.address or 'N/A', regular_style)],
                [Paragraph('Type', bold_style), Paragraph(cropped_image.polygon.type or 'N/A', regular_style)],
                [Paragraph('Label', bold_style), Paragraph(cropped_image.data.get('label', 'N/A'), regular_style)],
                [Paragraph('Description', bold_style), Paragraph(cropped_image.data.get('description', 'N/A'), regular_style)],
                # [Paragraph('Vehicle', bold_style), Paragraph(str(cropped_image.data.get('is_vehicle', 'N/A'))
                #     + ". "
                #     + cropped_image.data.get('vehicle_explanation', 'N/A'), regular_style)],
                # [Paragraph('Flammable', bold_style), Paragraph(str(cropped_image.data.get('is_flammable', 'N/A'))
                #     + ". "
                #     + cropped_image.data.get('flammable_explanation', 'N/A'), regular_style)],
                # [Paragraph('Permanent', bold_style), Paragraph(str(cropped_image.data.get('is_permanent', 'N/A'))
                #     + ". "
                #     + cropped_image.data.get('permanent_explanation', 'N/A'), regular_style)],
                # [Paragraph('Clear', bold_style), Paragraph(str(cropped_image.data.get('sufficient_clearance', 'N/A'))
                #     + ". "
                #     + cropped_image.data.get('sufficient_explanation', 'N/A'), regular_style)]
            ]

            # Define boolean attributes and their corresponding explanations
            boolean_attributes = [
                ('Vehicle', 'is_vehicle', 'vehicle_explanation'),
                ('Flammable', 'is_flammable', 'flammable_explanation'),
                ('Permanent', 'is_permanent', 'permanent_explanation'),
                ('Clear', 'sufficient_clearance', 'sufficient_explanation'),
            ]

            for attr_name, bool_key, explanation_key in boolean_attributes:
                is_true = cropped_image.data.get(bool_key, False)
                
                # if bool_key == 'sufficient_clearance':
                #     is_true = not is_true
                print(bool_key, is_true)

                explanation = cropped_image.data.get(explanation_key, 'N/A')

                # Choose the appropriate symbol based on the boolean value
                # status_symbol = danger_symbol if is_true else safe_symbol
                status_symbol = get_boolean_symbol_image(is_true, image_directory)


                # Create a nested table for each boolean attribute
                nested_table = Table([
                    [status_symbol, Paragraph(explanation, regular_style)]
                ], colWidths=[0.3 * inch, 2.85 * inch])  # Adjust column widths as needed
                nested_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),  # Align content to the top
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),  # Add gridlines
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),  # Add padding
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    

                    # Padding for the left column (0th column): no padding
                    # ('LEFTPADDING', (0, 0), (0, -1), 0),
                    # ('RIGHTPADDING', (0, 0), (0, -1), 0),
                    # ('TOPPADDING', (0, 0), (0, -1), 0),
                    # ('BOTTOMPADDING', (0, 0), (0, -1), 0),

                    # # Padding for the right column (1st column): apply padding of 6
                    # ('LEFTPADDING', (1, 0), (1, -1), 6),
                    # ('RIGHTPADDING', (1, 0), (1, -1), 6),
                    # ('TOPPADDING', (1, 0), (1, -1), 6),
                    # ('BOTTOMPADDING', (1, 0), (1, -1), 6),

                    # ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    # ('FONTSIZE', (0, 0), (-1, -1), 9),
                ]))
                
                # Add the nested table to the details data
                details_data.append([Paragraph(attr_name, bold_style), nested_table])


            details_table = Table(details_data, colWidths=[1.1 * inch, 3.15 * inch])

            details_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),  # Align content to the top
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),  # Add gridlines
                # ('LEFTPADDING', (0, 0), (-1, -1), 6),  # Add padding
                # ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                # ('TOPPADDING', (0, 0), (-1, -1), 6),
                # ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                # ('LEFTPADDING', (0, 0), (-1, -1), 0),  # Add padding
                # ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                # ('TOPPADDING', (0, 0), (-1, -1), 0),
                # ('BOTTOMPADDING', (0, 0), (-1, -1), 0),


                # Padding for the left column (0th column): no padding
                ('LEFTPADDING', (0, 0), (0, -1), 6),
                ('RIGHTPADDING', (0, 0), (0, -1), 6),
                ('TOPPADDING', (0, 0), (0, -1), 6),
                ('BOTTOMPADDING', (0, 0), (0, -1), 6),

                # Padding for the right column (1st column): apply padding of 6 for the first 5 rows
                ('LEFTPADDING', (1, 0), (1, 4), 6),  # Rows 0-4 in the right column (index 1)
                ('RIGHTPADDING', (1, 0), (1, 4), 6),
                ('TOPPADDING', (1, 0), (1, 4), 6),
                ('BOTTOMPADDING', (1, 0), (1, 4), 6),

                # Padding for the right column (1st column): no padding for rows beyond the first 5
                ('LEFTPADDING', (1, 5), (-1, -1), 0),  # Rows 5 onwards in the right column (index 1)
                ('RIGHTPADDING', (1, 5), (-1, -1), 0),
                ('TOPPADDING', (1, 5), (-1, -1), 0),
                ('BOTTOMPADDING', (1, 5), (-1, -1), 0),

                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
            ]))

            image = get_scaled_image(cropped_image.url, max_width=2.5 * inch, max_height=2.5 * inch)

            # Create the table with the details on the left and the image on the right
            table_data = [
                [
                    details_table,
                    image,
                ]
            ]

            table = Table(table_data, colWidths=[4.25 * inch, 2.75 * inch])

            table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),  # Align content to the top
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),  # Center the image horizontally
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),  # Add gridlines

                # Zero padding for the left column (column index 0)
                ('LEFTPADDING', (0, 0), (0, -1), 0),
                ('RIGHTPADDING', (0, 0), (0, -1), 0),
                ('TOPPADDING', (0, 0), (0, -1), 0),
                ('BOTTOMPADDING', (0, 0), (0, -1), 0),

                # 12 units of padding for the right column (column index 1)
                ('LEFTPADDING', (1, 0), (1, -1), 10),
                ('RIGHTPADDING', (1, 0), (1, -1), 10),
                ('TOPPADDING', (1, 0), (1, -1), 10),
                ('BOTTOMPADDING', (1, 0), (1, -1), 10),

                # Font settings for the entire table
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
            ]))

            # Add the table to the story
            story.append(table)
            story.append(PageBreak())  # Add a page break after each cropped image

        doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)

        buffer.seek(0)
        return buffer

    except Exception as e:
        raise Exception(f"An error occurred while generating the PDF: {str(e)}")
