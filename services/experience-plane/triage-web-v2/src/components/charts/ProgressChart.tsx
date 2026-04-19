/**
 * ProgressChart – D3-powered area chart
 * 
 * Displays time series data as a filled area chart
 * with gradient fill and smooth interpolation.
 */

import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';

interface DataPoint {
  date: Date | string;
  value: number;
  label?: string;
}

interface ProgressChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showAxis?: boolean;
  title?: string;
  unit?: string;
}

export function ProgressChart({
  data,
  width = 280,
  height = 120,
  color = '#00d4ff',
  showAxis = true,
  title,
  unit = '',
}: ProgressChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const margin = { top: 20, right: 10, bottom: showAxis ? 25 : 10, left: showAxis ? 45 : 10 };

  const parsedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      date: typeof d.date === 'string' ? new Date(d.date) : d.date,
    }));
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !parsedData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Scales
    const xExtent = d3.extent(parsedData, d => d.date) as [Date, Date];
    const xScale = d3.scaleTime()
      .domain(xExtent)
      .range([margin.left, width - margin.right]);

    const yMax = d3.max(parsedData, d => d.value) || 0;
    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([height - margin.bottom, margin.top]);

    // Gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', `areaGradient-${title?.replace(/\s+/g, '') || 'default'}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.4);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.05);

    // Area generator
    const area = d3.area<typeof parsedData[0]>()
      .x(d => xScale(d.date))
      .y0(height - margin.bottom)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3.line<typeof parsedData[0]>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Draw area
    svg.append('path')
      .datum(parsedData)
      .attr('fill', `url(#areaGradient-${title?.replace(/\s+/g, '') || 'default'})`)
      .attr('d', area);

    // Draw line
    svg.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);

    // X axis
    if (showAxis) {
      const xAxis = d3.axisBottom(xScale)
        .ticks(4)
        .tickFormat(d => d3.timeFormat('%b %d')(d as Date));

      svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .attr('class', 'axis x-axis')
        .call(xAxis)
        .selectAll('text')
        .attr('fill', '#666')
        .attr('font-size', '9px');

      svg.selectAll('.axis line, .axis path')
        .attr('stroke', '#333');
    }

    // Y axis
    if (showAxis) {
      const yAxis = d3.axisLeft(yScale)
        .ticks(4)
        .tickFormat(d => {
          const val = d as number;
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
          return String(val);
        });

      svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .attr('class', 'axis y-axis')
        .call(yAxis)
        .selectAll('text')
        .attr('fill', '#666')
        .attr('font-size', '9px');

      svg.selectAll('.axis line, .axis path')
        .attr('stroke', '#333');
    }

    // Latest value dot
    const lastPoint = parsedData[parsedData.length - 1];
    if (lastPoint) {
      svg.append('circle')
        .attr('cx', xScale(lastPoint.date))
        .attr('cy', yScale(lastPoint.value))
        .attr('r', 4)
        .attr('fill', color);

      svg.append('circle')
        .attr('cx', xScale(lastPoint.date))
        .attr('cy', yScale(lastPoint.value))
        .attr('r', 7)
        .attr('fill', color)
        .attr('fill-opacity', 0.3);
    }

    // Title
    if (title) {
      svg.append('text')
        .attr('x', margin.left)
        .attr('y', 12)
        .attr('fill', '#888')
        .attr('font-size', '10px')
        .attr('font-family', 'var(--font-mono)')
        .text(title);
    }

    // Latest value label
    if (lastPoint) {
      const formattedValue = lastPoint.value >= 1000000 
        ? `${(lastPoint.value / 1000000).toFixed(2)}M`
        : lastPoint.value >= 1000
        ? `${(lastPoint.value / 1000).toFixed(1)}K`
        : lastPoint.value.toFixed(2);

      svg.append('text')
        .attr('x', width - margin.right)
        .attr('y', 12)
        .attr('text-anchor', 'end')
        .attr('fill', color)
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'var(--font-mono)')
        .text(`${formattedValue}${unit}`);
    }

  }, [parsedData, width, height, color, showAxis, title, unit, margin]);

  return (
    <div className="progress-chart">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}
