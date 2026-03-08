import React, { useState, useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";

export const DraggablePanel = ({
  title,
  icon: Icon,
  children,
  defaultPos,
  onClose,
  accentColor = "#06b6d4"
}) => {
  const [pos, setPos] = useState(defaultPos || { x: 50, y: 50 });
  const [size, setSize] = useState({ width: 320, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);

  const onDragStart = (e) => {
    if (e.target.closest(".no-drag")) return;
    setIsDragging(true);
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;

    const onMove = (ev) => {
      setPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onResizeStart = (e) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const onResizeMove = (ev) => {
      setSize({
        width: Math.max(250, startWidth + (ev.clientX - startX)),
        height: Math.max(150, startHeight + (ev.clientY - startY)),
      });
    };

    const onResizeUp = () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeUp);
    };

    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeUp);
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        background: "rgba(2, 6, 23, 0.7)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${accentColor}40`,
        borderRadius: "12px",
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 0 10px ${accentColor}10`,
        display: "flex",
        flexDirection: "column",
        zIndex: isDragging ? 20000 : 10000,
        transition: isDragging ? "none" : "box-shadow 0.2s",
      }}
      className="text-white overflow-hidden"
    >
      {/* Header */}
      <div
        onMouseDown={onDragStart}
        className="flex justify-between items-center px-4 py-2 cursor-move border-b"
        style={{ borderColor: `${accentColor}30`, background: `${accentColor}15` }}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          {Icon && <Icon size={14} color={accentColor} />}
          <span className="font-bold text-xs uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif", color: accentColor }}>
            {title}
          </span>
        </div>
        <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} className="no-drag text-slate-400 hover:text-red-400 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 no-drag relative">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-1 opacity-50 hover:opacity-100 transition-opacity"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 8H0L8 0V8Z" fill={accentColor} />
        </svg>
      </div>
    </div>
  );
};
