import React, { useState, useRef, useEffect } from 'react';
import { ChromePicker, ColorResult } from 'react-color';
import './ColorPicker.css';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [internalColor, setInternalColor] = useState(color);
  const swatchRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInternalColor(color);
  }, [color]);

  const handleClick = () => {
    setDisplayColorPicker(!displayColorPicker);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        displayColorPicker &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        swatchRef.current &&
        !swatchRef.current.contains(event.target as Node)
      ) {
        setDisplayColorPicker(false);
      }
    };

    if (displayColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [displayColorPicker]);

  const handleChange = (color: ColorResult) => {
    setInternalColor(color.hex);
  };

  const handleChangeComplete = (color: ColorResult) => {
    onChange(color.hex);
  };

  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    marginTop: 0,
  };

  if (displayColorPicker && swatchRef.current) {
    const rect = swatchRef.current.getBoundingClientRect();
    popoverStyle.top = rect.bottom + 10;
    popoverStyle.left = rect.left;
  }

  return (
    <div className="color-picker">
      <div className="swatch" onClick={handleClick} ref={swatchRef}>
        <div className="color" style={{ backgroundColor: internalColor }} />
      </div>
      {displayColorPicker ? (
        <div className="popover" style={popoverStyle} ref={popoverRef}>
          <ChromePicker 
            color={internalColor} 
            onChange={handleChange} 
            onChangeComplete={handleChangeComplete}
            disableAlpha={true}
          />
        </div>
      ) : null}
    </div>
  );
};

export default ColorPicker;
