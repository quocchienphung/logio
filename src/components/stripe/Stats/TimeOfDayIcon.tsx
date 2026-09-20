/** Sun/moon glyph for the time-of-day picker (paths from the reference DOM; CSS morphs it per theme). */
export function TimeOfDayIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="time-of-day-select-icon"
    >
      <g className="time-of-day-select-icon__sun-group">
        <circle
          cx="5"
          cy="5"
          r="4.25"
          transform="matrix(1 0 0 -1 5 15)"
          stroke="currentColor"
          strokeWidth="1.5"
          className="time-of-day-select-icon__sun-center"
        />
        <path
          d="M10 17.25C14.0041 17.25 17.25 14.0041 17.25 10"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__sun-path time-of-day-select-icon__sun-bottom-right"
        />
        <path
          d="M10 17.25C5.99594 17.25 2.75 14.0041 2.75 10"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__sun-path time-of-day-select-icon__sun-bottom-left"
        />
        <path
          d="M10 2.75C5.99594 2.75 2.75 5.99593 2.75 10"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__sun-path time-of-day-select-icon__sun-top-left"
        />
        <path
          d="M10 2.75C14.0041 2.75 17.25 5.99594 17.25 10"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__sun-path time-of-day-select-icon__sun-top-right"
        />
        <path
          d="M16.5 10H19"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__ray time-of-day-select-icon__ray-one"
        />
        <path
          d="M14.5962 14.5962L16.364 16.364"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__ray time-of-day-select-icon__ray-two"
        />
        <path
          d="M10 16.5V19"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__ray time-of-day-select-icon__ray-three"
        />
        <path
          d="M5.404 14.596L3.63623 16.3638"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__ray time-of-day-select-icon__ray-four"
        />
        <path
          d="M3.5 10H1"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__ray time-of-day-select-icon__ray-five"
        />
        <path
          d="M5.404 5.404L3.63623 3.63623"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__ray time-of-day-select-icon__ray-six"
        />
        <path
          d="M10 3.5V1"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__ray time-of-day-select-icon__ray-seven"
        />
        <path
          d="M16.364 3.63604L14.5962 5.40381"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength="1"
          className="time-of-day-select-icon__ray time-of-day-select-icon__ray-eight"
        />
      </g>
      <path
        d="M8.84473 4.19678C8.41483 5.57119 8.02147 8.0825 9.96973 10.0308C11.9176 11.9782 14.4272 11.5836 15.8018 11.1538C15.2653 13.8687 12.8724 15.9163 10 15.9165C6.73242 15.9165 4.08318 13.268 4.08301 10.0005C4.08301 7.12833 6.13028 4.73366 8.84473 4.19678Z"
        stroke="currentColor"
        strokeWidth="1.5"
        className="time-of-day-select-icon__moon"
      />
    </svg>
  );
}
