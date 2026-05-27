import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

type SwitchSize = 'small' | 'medium' | 'large';

const SwitchContext = createContext<{
  value: string | null;
  setValue: (value: string) => void;
} | null>(null);

interface SwitchProps {
  children: React.ReactNode;
  name?: string;
  size?: SwitchSize;
  style?: React.CSSProperties;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
}

export const Switch = ({
  children,
  name = 'default',
  size = 'medium',
  style,
  value,
  defaultValue = null,
  onValueChange,
}: SwitchProps) => {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue);

  const contextValue = useMemo(
    () => ({
      value: isControlled ? value : internalValue,
      setValue: (nextValue: string) => {
        if (!isControlled) {
          setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
      },
    }),
    [internalValue, isControlled, onValueChange, value],
  );

  return (
    <SwitchContext.Provider value={contextValue}>
      <div
        className={clsx(
          'flex bg-white/70 p-1 shadow-sm',
          size === 'small' && 'h-8 rounded-md',
          size === 'medium' && 'h-10 rounded-md',
          size === 'large' && 'h-12 rounded-lg',
        )}
        style={style}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement<SwitchControlProps>(child)) {
            return child;
          }

          return React.cloneElement(child, { size, name });
        })}
      </div>
    </SwitchContext.Provider>
  );
};

interface SwitchControlProps {
  label?: string;
  value: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  name?: string;
  size?: SwitchSize;
  icon?: React.ReactNode;
  activeClassName?: string;
}

const SwitchControl = ({
  label,
  value,
  defaultChecked,
  disabled = false,
  name,
  size = 'medium',
  icon,
  activeClassName,
}: SwitchControlProps) => {
  const context = useContext(SwitchContext);
  const checked = value === context?.value;

  useEffect(() => {
    if (defaultChecked) {
      context?.setValue(value);
    }
  }, []);

  return (
    <label
      className={clsx('flex flex-1 h-full', disabled && 'cursor-not-allowed pointer-events-none')}
      onClick={() => context?.setValue(value)}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        checked={checked}
        onChange={() => context?.setValue(value)}
        className="hidden"
      />
      <span
        className={twMerge(
          clsx(
            'flex items-center justify-center flex-1 cursor-pointer font-medium font-sans duration-150',
            checked
              ? clsx('bg-gray-100 text-gray-1000 fill-gray-1000 rounded-sm', activeClassName)
              : 'text-gray-900 hover:text-gray-1000 fill-gray-900 hover:fill-gray-1000',
            disabled && 'text-gray-800 fill-gray-800',
            !icon && size === 'small' && 'text-sm px-3',
            !icon && size === 'medium' && 'text-sm px-3',
            !icon && size === 'large' && 'text-base px-4',
            icon && size === 'small' && 'py-1 px-2',
            icon && size === 'medium' && 'py-2 px-3',
            icon && size === 'large' && 'p-3',
          ),
        )}
      >
        {icon ? <span className={clsx(size === 'large' && 'scale-125')}>{icon}</span> : label}
      </span>
    </label>
  );
};

Switch.Control = SwitchControl;
