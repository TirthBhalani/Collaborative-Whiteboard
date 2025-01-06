const shapeBtn = document.getElementById("shape");
const textBtn = document.getElementById("text");
const saveBtn = document.getElementById("save");
const shapeSelect = document.getElementById("shape-select");

let selectedShape = "rectangle";
let isDrawingShape = false;
let startX, startY;
let selectedFont = "Arial";
let fontSize = "20px";
let isAddingText = false;

io.on("onShapeStart", ({ startX: remoteStartX, startY: remoteStartY }) => {
    startX = remoteStartX;
    startY = remoteStartY;
});

io.on("onShapeUpdate", (data) => {
    const lastImage = canvasHistory[canvasHistory.length - 1];
    if (lastImage) {
        const img = new Image();
        img.src = lastImage;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            drawShapeFromData(data);
        };
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawShapeFromData(data);
    }
});

io.on("onShapeEnd", (data) => {
    drawShapeFromData(data);
    saveCanvasState();
});

io.on("onTextAdd", (data) => {
    ctx.font = `${data.fontSize} ${data.font}`;
    ctx.fillStyle = data.color;
    ctx.fillText(data.text, data.x, data.y);
    saveCanvasState();
});

const drawShapeFromData = (data) => {
    ctx.beginPath();
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    
    switch (data.shape) {
        case "rectangle":
            ctx.strokeRect(data.startX, data.startY, data.width, data.height);
            break;
            
        case "circle":
            const radius = data.radius;
            ctx.beginPath();
            ctx.arc(data.startX, data.startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
            
        case "line":
            ctx.beginPath();
            ctx.moveTo(data.startX, data.startY);
            ctx.lineTo(data.currentX, data.currentY);
            ctx.stroke();
            break;
            
        case "triangle":
            ctx.beginPath();
            ctx.moveTo(data.startX, data.startY);
            ctx.lineTo(data.currentX, data.currentY);
            ctx.lineTo(data.startX - (data.currentX - data.startX), data.currentY);
            ctx.closePath();
            ctx.stroke();
            break;
    }
};

const drawShape = (e) => {
    if (!isDrawingShape || selectedTool !== "shape") return;
    
    const currentX = e.offsetX;
    const currentY = e.offsetY;
    
    const lastImage = canvasHistory[canvasHistory.length - 1];
    if (lastImage) {
        const img = new Image();
        img.src = lastImage;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const shapeData = createShapeData(currentX, currentY);
            drawShapeFromData(shapeData);
            
            io.emit("shapeUpdate", shapeData);
        };
    }
};

const createShapeData = (currentX, currentY) => {
    const baseData = {
        startX,
        startY,
        currentX,
        currentY,
        shape: selectedShape,
        color: selectedColor,
        width: penWidth
    };

    switch (selectedShape) {
        case "rectangle":
            return {
                ...baseData,
                width: currentX - startX,
                height: currentY - startY
            };
        case "circle":
            return {
                ...baseData,
                radius: Math.sqrt(
                    Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)
                )
            };
        default:
            return baseData;
    }
};

const addText = (e) => {
    if (!isAddingText || selectedTool !== "text") return;
    
    const text = prompt("Enter your text:");
    if (text) {
        const textData = {
            text,
            x: e.offsetX,
            y: e.offsetY,
            color: selectedColor,
            fontSize,
            font: selectedFont
        };

        ctx.font = `${fontSize} ${selectedFont}`;
        ctx.fillStyle = selectedColor;
        ctx.fillText(text, e.offsetX, e.offsetY);
        
        io.emit("textAdd", textData);
        
        saveCanvasState();
    }
    isAddingText = false;
};

// Save / Export
const saveCanvas = (format) => {
    switch (format) {
        case 'png':
            const pngData = canvas.toDataURL("image/png");
            downloadImage(pngData, 'whiteboard.png');
            break;
            
        case 'pdf':
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            const imgData = canvas.toDataURL("image/png");
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save("whiteboard.pdf");
            break;
    }
};

const downloadImage = (data, filename) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = filename;
    link.click();
};

const restoreLastState = () => {
    if (canvasHistory.length > 0) {
        const lastState = new Image();
        lastState.src = canvasHistory[canvasHistory.length - 1];
        lastState.onload = () => {
            ctx.drawImage(lastState, 0, 0);
        };
    }
};

canvas.addEventListener("mousedown", (e) => {
    if (selectedTool === "shape") {
        isDrawingShape = true;
        startX = e.offsetX;
        startY = e.offsetY;
        
        io.emit("shapeStart", { startX, startY });
        
        saveCanvasState();
    } else if (selectedTool === "text") {
        isAddingText = true;
        addText(e);
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (selectedTool === "shape") {
        drawShape(e);
    }
});

canvas.addEventListener("mouseup", () => {
    if (selectedTool === "shape" && isDrawingShape) {
        isDrawingShape = false;
        const finalShapeData = createShapeData(
            event.offsetX,
            event.offsetY
        );
        io.emit("shapeEnd", finalShapeData);
        saveCanvasState();
    }
});

shapeBtn.addEventListener("click", () => {
    selectedTool = "shape";
    isDrawingShape = false;
    ctx.globalCompositeOperation = "source-over";
    
    if (shapeSelect.style.display === "none") {
        shapeSelect.style.display = "block";
    }
});

textBtn.addEventListener("click", () => {
    selectedTool = "text";
    isAddingText = false;
    ctx.globalCompositeOperation = "source-over";
    shapeSelect.style.display = "none";
});

saveBtn.addEventListener("click", () => {
    const format = prompt("Enter format (png/pdf):", "png");
    if (format === "png" || format === "pdf") {
        saveCanvas(format);
    }
});

if (shapeSelect) {
    shapeSelect.addEventListener("change", (e) => {
        selectedShape = e.target.value;
    });
}