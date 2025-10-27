//utils/coverLetterUtils.ts

import { CoverLetter, GeneratedCoverLetter } from '@/types';

export function transformToDBCoverLetter(
  generated: GeneratedCoverLetter,
  userData: {
    userId: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
  }
): Omit<CoverLetter, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userData.userId,
    title: generated.title,
    content: {
      body: generated.content,
      signature: generated.signature || userData.name,
      contact: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        ...(userData.address && { address: userData.address })
      }
    },
    ai_data: {
      generation_details: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        timestamp: new Date().toISOString()
      }
    },
    is_mock: false
  };
}