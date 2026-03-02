const pdfPath = './sertifikat.pdf';
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const pdfViewer = document.getElementById('pdf-viewer');
const pdfRender = document.getElementById('pdf-render');
const notFoundMessage = document.getElementById('not-found');
const loadingMessage = document.getElementById('loading');
const actionButtons = document.getElementById('action-buttons');
const printButton = document.getElementById('print-button');
const downloadButton = document.getElementById('download-button');

// Store the found page number
let foundPageNumber = -1;

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// --- Helper function to create a single-page PDF ---
async function createSinglePagePdf(pageNumber) {
    const existingPdfBytes = await fetch(pdfPath).then(res => res.arrayBuffer());
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const newPdfDoc = await PDFDocument.create();
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1]);
    newPdfDoc.addPage(copiedPage);
    
    return await newPdfDoc.save();
}

// --- Event Listeners ---
searchButton.addEventListener('click', async () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) return;

    // Reset UI
    notFoundMessage.style.display = 'none';
    pdfViewer.style.display = 'none';
    actionButtons.style.display = 'none';
    loadingMessage.style.display = 'block';
    foundPageNumber = -1;

    try {
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const pdf = await loadingTask.promise;

        let found = false;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();

            if (pageText.includes(searchTerm)) {
                // Render the page on canvas
                const viewport = page.getViewport({ scale: 2.0 });
                const context = pdfRender.getContext('2d');
                pdfRender.height = viewport.height;
                pdfRender.width = viewport.width;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                
                // Show viewer and action buttons
                pdfViewer.style.display = 'block';
                actionButtons.style.display = 'block';
                foundPageNumber = i;
                found = true;
                break;
            }
        }

        if (!found) {
            notFoundMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading or searching PDF:', error);
        notFoundMessage.innerText = 'Gagal memuat atau mencari PDF. Periksa konsol untuk detailnya.';
        notFoundMessage.style.display = 'block';
    } finally {
        loadingMessage.style.display = 'none';
    }
});

printButton.addEventListener('click', async () => {
    if (foundPageNumber === -1) return;
    
    try {
        const pdfBytes = await createSinglePagePdf(foundPageNumber);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
            setTimeout(() => {
                iframe.focus();
                iframe.contentWindow.print();
            }, 1);
        };
    } catch (error) {
        console.error('Failed to print PDF:', error);
        alert('Gagal menyiapkan file untuk dicetak.');
    }
});

downloadButton.addEventListener('click', async () => {
    if (foundPageNumber === -1) return;

    try {
        const pdfBytes = await createSinglePagePdf(foundPageNumber);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sertifikat_${searchInput.value.trim().replace(' ', '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Failed to download PDF:', error);
        alert('Gagal mengunduh file.');
    }
});
