import React from 'react';
import { Input, Select, InputNumber } from 'antd';

const { Option } = Select;

interface TimeInputWithUnitProps {
  value?: number; // 毫秒值
  onChange?: (value: number | null) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const TimeInputWithUnit: React.FC<TimeInputWithUnitProps> = ({
  value,
  onChange,
  placeholder,
  style
}) => {
  // 智能显示：如果是1000的倍数且>=1000，显示为秒，否则显示为毫秒
  const getDisplayValue = (ms: number | undefined): { value: number | undefined, unit: 'ms' | 's' } => {
    if (!ms) return { value: undefined, unit: 'ms' };

    if (ms >= 1000 && ms % 1000 === 0) {
      // 确保显示为整数，不显示小数位
      return { value: Math.round(ms / 1000), unit: 's' };
    }
    // 毫秒也确保为整数
    return { value: Math.round(ms), unit: 'ms' };
  };

  const displayData = getDisplayValue(value);
  const [inputValue, setInputValue] = React.useState<number | undefined>(displayData.value);
  const [unit, setUnit] = React.useState<'ms' | 's'>(displayData.unit);

  // 当外部value变化时，更新内部状态
  React.useEffect(() => {
    const newDisplayData = getDisplayValue(value);
    setInputValue(newDisplayData.value);
    setUnit(newDisplayData.unit);
  }, [value]);

  // 转换为毫秒
  const convertToMs = (val: number | undefined, currentUnit: 'ms' | 's'): number | null => {
    if (val === undefined || val === null) return null;
    return currentUnit === 's' ? val * 1000 : val;
  };

  // 处理数值变化
  const handleValueChange = (val: number | null) => {
    setInputValue(val || undefined);
    const msValue = convertToMs(val || undefined, unit);
    onChange?.(msValue);
  };

  // 处理单位变化
  const handleUnitChange = (newUnit: 'ms' | 's') => {
    setUnit(newUnit);
    const msValue = convertToMs(inputValue, newUnit);
    onChange?.(msValue);
  };

  return (
    <Input.Group compact style={style}>
      <InputNumber
        value={inputValue}
        onChange={handleValueChange}
        placeholder={placeholder}
        style={{ width: '70%' }}
        min={0}
        precision={unit === 's' ? 3 : 0} // 秒支持3位小数(毫秒精度)，毫秒只支持整数
        step={unit === 's' ? 0.1 : 100} // 秒单位步长0.1，毫秒单位步长100
        formatter={(value) => {
          // 格式化显示：移除不必要的尾随零
          if (value === undefined || value === null) return '';
          const num = Number(value);
          return num % 1 === 0 ? num.toString() : num.toString();
        }}
      />
      <Select
        value={unit}
        onChange={handleUnitChange}
        style={{ width: '30%' }}
      >
        <Option value="ms">毫秒</Option>
        <Option value="s">秒</Option>
      </Select>
    </Input.Group>
  );
};

export default TimeInputWithUnit;
