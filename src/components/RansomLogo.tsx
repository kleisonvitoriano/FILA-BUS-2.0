import React from "react";

export default function RansomLogo() {
  const fila = [
    { char: "F", bg: "bg-white", text: "text-black", rotate: -4 },
    { char: "I", bg: "bg-theme", text: "text-white", rotate: 6 },
    { char: "L", bg: "bg-white", text: "text-black", rotate: -3 },
    { char: "A", bg: "bg-black border border-theme", text: "text-theme", rotate: 5 }
  ];

  const bus = [
    { char: "B", bg: "bg-black", text: "text-white", rotate: -5 },
    { char: "U", bg: "bg-white", text: "text-black", rotate: 3 },
    { char: "S", bg: "bg-theme", text: "text-white", rotate: -7 }
  ];

  return (
    <div className="flex flex-col items-start font-black select-none gap-1 py-1">
      {/* "FILA" Row */}
      <div className="flex items-center">
        {fila.map((item, index) => (
          <span 
            key={index}
            className={`inline-block px-3 py-1 text-xl md:text-2xl font-extrabold shadow-sm transition-transform hover:scale-115 duration-100 ${item.bg} ${item.text} ml-0.5`}
            style={{
              transform: `rotate(${item.rotate}deg)`,
              boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)",
              clipPath: index % 2 === 0 ? "polygon(0 8%, 100% 0, 100% 92%, 0 100%)" : "polygon(5% 0, 100% 8%, 95% 100%, 0 92%)"
            }}
          >
            {item.char}
          </span>
        ))}
      </div>

      {/* "BUS" Row */}
      <div className="flex items-center ml-2">
        {bus.map((item, index) => (
          <span 
            key={index}
            className={`inline-block px-3 py-1 text-xl md:text-2xl font-extrabold shadow-sm transition-transform hover:scale-115 duration-100 ${item.bg} ${item.text} ml-0.5`}
            style={{
              transform: `rotate(${item.rotate}deg)`,
              boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)",
              clipPath: index % 2 === 1 ? "polygon(0 8%, 100% 0, 100% 92%, 0 100%)" : "polygon(5% 0, 100% 8%, 95% 100%, 0 92%)"
            }}
          >
            {item.char}
          </span>
        ))}
      </div>
    </div>
  );
}
