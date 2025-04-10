const { jsPDF } = window.jspdf;

document.getElementById('generate-pdf').addEventListener('click', async () => {
    const input = document.getElementById('file-input');
    const files = input.files;
    if (files.length === 0) {
        alert('Пожалуйста, выберите файлы изображений');
        return;
    }

    let maxWidth = 0;
    let maxHeight = 0;

    for (let i = 0; i < files.length; i++) {
        const imageDataUrl = await readFileAsDataURL(files[i]);
        const img = await loadImage(imageDataUrl);

        maxWidth = Math.max(maxWidth, img.width);
        maxHeight = Math.max(maxHeight, img.height);
    }

    const pdf = new jsPDF({
        orientation: maxWidth > maxHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [maxWidth, maxHeight]
    });

    for (let i = 0; i < files.length; i++) {
        const imageDataUrl = await readFileAsDataURL(files[i]);
        const img = await loadImage(imageDataUrl);

        const imgWidth = maxWidth;
        const imgHeight = (img.height * imgWidth) / img.width;

        if (i !== 0) pdf.addPage([maxWidth, maxHeight]);
        pdf.addImage(img, 'JPEG', 0, 0, imgWidth, imgHeight);
    }

    pdf.save(files[0].name + '.pdf');
});

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

function loadImage(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = dataUrl;
    });
}
