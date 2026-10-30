export default function PolyDecoration() {
  return (
    <div
      aria-hidden="true"
      className="fixed bottom-0 right-0 pointer-events-none select-none z-0 overflow-hidden w-40 h-40 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96"
    >
      <svg
        viewBox="0 0 320 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain translate-x-4 translate-y-4"
      >
        {/* Facet: deep teal #119178 */}
        <polygon points="130,80 280,140 190,260 70,180" fill="#119178" />

        {/* Facet: mint #6DD5BE */}
        <polygon points="130,80 280,140 310,40 190,10" fill="#6DD5BE" />

        {/* Facet: cyan mint #6ED8C1 */}
        <polygon points="280,140 320,230 190,260" fill="#6ED8C1" />

        {/* Facet: soft cyan #7EC9DC */}
        <polygon points="190,260 270,320 140,320 70,180" fill="#7EC9DC" />

        {/* Facet: back facet highlight #6DD5BE */}
        <polygon points="70,180 130,80 190,10 50,70" fill="#6DD5BE" opacity="0.85" />

        {/* Facet: right bottom shade #119178 */}
        <polygon points="280,140 320,230 320,320 270,320 190,260" fill="#119178" opacity="0.95" />
      </svg>
    </div>
  );
}

