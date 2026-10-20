import React from "react";

export function Link({ to, href, children, className, style, onClick, ...rest }) {
  const destination = to || href || "#";
  return (
    <a
      href={destination}
      className={className}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {children}
    </a>
  );
}

export default Link;
