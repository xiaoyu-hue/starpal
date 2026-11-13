/**
 * 资料可选字段枚举（前端展示值）。
 * 与服务端 server/src/config/constants.ts 的 ZODIAC_VALUES / MBTI_VALUES / AGE_BAND_VALUES
 * 保持一致；服务端为权威校验，此处仅用于渲染选项。改动须同步两端。
 */
export const ZODIAC_VALUES = [
  '白羊座',
  '金牛座',
  '双子座',
  '巨蟹座',
  '狮子座',
  '处女座',
  '天秤座',
  '天蝎座',
  '射手座',
  '摩羯座',
  '水瓶座',
  '双鱼座',
] as const

export const MBTI_VALUES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const

export const AGE_BAND_VALUES = [
  '18岁以下',
  '18-24岁',
  '25-34岁',
  '35-44岁',
  '45-54岁',
  '55岁以上',
] as const
