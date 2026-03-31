import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportData {
    totalArea: number;
    compliantArea: number;
    illegalArea: number;
    violations: string[];
    timestamp: string;
}

export const generatePDFReport = async (data: ReportData): Promise<void> => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 58, 95); // #1e3a5f
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Mining Compliance Report', 15, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('State Mining Department - Official Document', 15, 22);
    doc.text(`Generated: ${data.timestamp}`, 15, 28);

    // Summary Section
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 15, 50);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 53, pageWidth - 15, 53);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const summaryY = 62;
    doc.text(`Total Mining Area: ${data.totalArea} ha`, 20, summaryY);
    doc.text(`Compliant Area: ${data.compliantArea} ha`, 20, summaryY + 8);
    doc.text(`Illegal Area: ${data.illegalArea} ha`, 20, summaryY + 16);

    // Status
    doc.setFont('helvetica', 'bold');
    if (data.illegalArea > 0) {
        doc.setTextColor(239, 68, 68); // Red
        doc.text('Status: NON-COMPLIANT', 20, summaryY + 28);
    } else {
        doc.setTextColor(34, 197, 94); // Green
        doc.text('Status: COMPLIANT', 20, summaryY + 28);
    }

    // Violations Section
    if (data.violations.length > 0) {
        doc.setTextColor(30, 58, 95);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Violation Details', 15, summaryY + 45);

        doc.line(15, summaryY + 48, pageWidth - 15, summaryY + 48);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);

        data.violations.forEach((v, i) => {
            doc.text(`${i + 1}. ${v}`, 20, summaryY + 58 + (i * 8));
        });
    }

    // Try to capture map screenshot
    const mapElement = document.querySelector('.leaflet-container');
    if (mapElement) {
        try {
            const canvas = await html2canvas(mapElement as HTMLElement, {
                useCORS: true,
                allowTaint: true,
                scale: 1,
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.8);

            // Add map image
            doc.addPage();
            doc.setFillColor(30, 58, 95);
            doc.rect(0, 0, pageWidth, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.text('Satellite Map Analysis', 15, 13);

            const imgWidth = pageWidth - 30;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            doc.addImage(imgData, 'JPEG', 15, 30, imgWidth, Math.min(imgHeight, 200));
        } catch (err) {
            console.warn('Could not capture map:', err);
        }
    }

    // Footer
    const footer = (pageNum: number) => {
        doc.setPage(pageNum);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Page ${pageNum} | Mining Compliance Report | Confidential Government Document`,
            pageWidth / 2,
            290,
            { align: 'center' }
        );
    };

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        footer(i);
    }

    // Download
    doc.save(`Mining-Compliance-Report-${Date.now()}.pdf`);
};
