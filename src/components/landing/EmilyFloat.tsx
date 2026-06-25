// Wrapper da landing page — fixa context="public" para que Index.tsx não precise mudar.
import { EmilyChat, type EmilyChatProps } from '@/components/emily/EmilyChat';

type EmilyFloatProps = Omit<EmilyChatProps, 'context'>;

export function EmilyFloat(props: EmilyFloatProps) {
  return <EmilyChat context="public" {...props} />;
}
