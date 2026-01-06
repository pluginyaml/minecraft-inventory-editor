"use client";

import Image from "next/image";
import type React from "react";
import { cn } from "@/lib/utils";

interface ItemSlotProps {
    position: number;
    item?: { id: string; image: string; position: number | null };
    onDrop: (position: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onClick: (position: number) => void;
    onDragStart?: (id: string) => void;
}

export default function ItemSlot({
    position,
    item,
    onDrop,
    onDragOver,
    onClick,
    onDragStart,
}: ItemSlotProps) {
    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: Drag and drop functionality requires native DOM events
        // biome-ignore lint/a11y/useKeyWithClickEvents: Click handler is for game inventory interaction, keyboard alternative provided at parent level
        <div
            className={cn(
                "w-10 h-10 bg-gray-500/50 border border-gray-300 flex items-center justify-center",
                "transition-all duration-100 cursor-pointer hover:bg-gray-400/30",
            )}
            onClick={() => onClick(position)}
            onDrop={() => onDrop(position)}
            onDragOver={onDragOver}
        >
            {item && (
                // biome-ignore lint/a11y/noStaticElementInteractions: Draggable item requires onDragStart event on non-interactive element
                <div
                    className="w-full h-full flex items-center justify-center"
                    draggable={!!onDragStart}
                    onDragStart={() => onDragStart?.(item.id)}
                >
                    <Image
                        src={item.image || "/placeholder.svg"}
                        alt="Item"
                        width={32}
                        height={32}
                        className="pixelated object-contain"
                        draggable={false}
                    />
                </div>
            )}
        </div>
    );
}
