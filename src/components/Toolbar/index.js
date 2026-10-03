import "./Toolbar.css";
export default function Toolbar({ title, subtitle, leftItems, rightItems }) {
  return (
    <header className="toolbar">
      <div className="left-items">{leftItems}</div>
      <div className="toolbar-heading">
        <h1 className="toolbar-title">{title}</h1>
        {subtitle}
      </div>
      <div className="right-items">{rightItems}</div>
    </header>
  );
}
