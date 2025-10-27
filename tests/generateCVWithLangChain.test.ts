import { generateCVWithLangChain } from '@/lib/langchain/cvGenerator';
import { UserFormData } from '@/types';

describe('generateCVWithLangChain', () => {
  it('should generate a CV with valid input', async () => {
    const userData: UserFormData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '123-456-7890',
      education: 'BSc in Computer Science',
      workExperience: '5 years as a software developer',
      skills: 'JavaScript, React, Node.js',
      languages: 'English, Finnish',
      age: '30',
      location: 'Helsinki',
      hobbies: 'Hiking, programming',
      linkedIn: 'https://linkedin.com/in/johndoe',
      language: 'English',
      personalityTraits: 'Creative, detail-oriented',
      cvType: 'technical'
    };

    const result = await generateCVWithLangChain(userData);
    expect(result).toHaveProperty('personal_description');
    expect(result).toHaveProperty('cv_content');
    expect(result).toHaveProperty('styles');
    expect(result).toHaveProperty('image_data');
  });
});