document.addEventListener('DOMContentLoaded', function () {
    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const tooltip = createTooltip();

    submitBtn.addEventListener('click', generateOntology);
    resetBtn.addEventListener('click', resetVisualization);
    downloadBtn.addEventListener('click', downloadSVG);

    function createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.classList.add('tooltip');
        document.body.appendChild(tooltip);
        return tooltip;
    }

    function showTooltip(content, x, y) {
        tooltip.innerHTML = content;
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y + 10}px`;
        tooltip.style.display = 'block';
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
    }

    function resetVisualization() {
        d3.select("#ontology").html(''); // Clear previous SVG elements
    }

    function downloadSVG() {
        const svg = d3.select("svg").node();
        const serializer = new XMLSerializer();
        const svgBlob = new Blob([serializer.serializeToString(svg)], { type: "image/svg+xml" });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download = "ontology_visualization.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    function generateOntology() {
        const userInput = document.getElementById('jsonInput').value;
        try {
            const jsonData = JSON.parse(userInput);
            visualizeOntology(jsonData);
        } catch (error) {
            alert("Invalid JSON format. Please enter valid JSON.");
        }
    }

    function visualizeOntology(jsonData) {
        resetVisualization();

        const graphData = {
            nodes: [],
            links: []
        };

        if (!jsonData.classes || !jsonData.datatypeProperties || !jsonData.objectProperties) {
            alert('Invalid JSON structure. Make sure it includes "classes", "datatypeProperties", and "objectProperties".');
            return;
        }

        jsonData.classes.forEach(cls => {
            graphData.nodes.push({ id: cls.id, type: 'class', label: cls.label });
        });

        jsonData.datatypeProperties.forEach(prop => {
            const datatypeNode = `${prop.property}: ${prop.value}`;
            graphData.nodes.push({ id: datatypeNode, type: 'datatype', label: prop.property });
            graphData.links.push({ source: prop.class, target: datatypeNode, type: 'datatype' });
        });

        jsonData.objectProperties.forEach(prop => {
            graphData.links.push({ source: prop.subject, target: prop.object, type: prop.predicate });
        });

        const width = 800, height = 600;

        // Set up SVG with zoom and pan behavior
        const svg = d3.select("#ontology").append("svg")
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom().on("zoom", function (event) {
                svgGroup.attr("transform", event.transform); // Zoom and pan
            }));

        const svgGroup = svg.append("g"); // A group to apply zoom/pan

        const simulation = d3.forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = svgGroup.selectAll(".link")
            .data(graphData.links)
            .enter().append("line")
            .attr("class", "link")
            .attr("stroke-width", d => d.type === 'datatype' ? 2 : 3)
            .attr("stroke", d => d.type === 'datatype' ? '#ff7f0e' : '#2ca02c');

        const node = svgGroup.selectAll(".node")
            .data(graphData.nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("r", d => d.type === 'class' ? 25 : 15)
            .attr("fill", d => d.type === 'class' ? "#1f77b4" : "#ff7f0e")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        const label = svgGroup.selectAll("text")
            .data(graphData.nodes)
            .enter().append("text")
            .attr("dx", 15)
            .attr("dy", ".35em")
            .text(d => d.label);

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("cx", d => d.x)
                .attr("cy", d => d.y);

            label.attr("x", d => d.x)
                .attr("y", d => d.y);
        });

        node.on("mouseover", (event, d) => {
            showTooltip(`Type: ${d.type}<br>ID: ${d.id}`, event.pageX, event.pageY);
        }).on("mouseout", () => {
            hideTooltip();
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }
});