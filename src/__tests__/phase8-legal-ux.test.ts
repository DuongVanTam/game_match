import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return React.createElement('a', { href }, children);
  };
});

// Mock auth hook
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: null,
    signOut: jest.fn(),
  }),
}));

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Phase 8 - Legal UX & Documentation', () => {
  describe('Legal Pages Structure', () => {
    it('should have all required legal pages', () => {
      // Test that all required pages exist

      const requiredPages = [
        'src/app/how-it-works/page.tsx',
        'src/app/terms/page.tsx',
        'src/app/privacy/page.tsx',
        'src/app/faq/page.tsx',
        'src/app/contact/page.tsx',
        'src/components/Navigation.tsx',
        'src/components/Footer.tsx',
      ];

      requiredPages.forEach((page) => {
        const fullPath = path.join(process.cwd(), page);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });
  });

  describe('Legal Terminology Compliance', () => {
    it('should use proper legal terminology in business pages', () => {
      const businessPages = [
        'src/app/how-it-works/page.tsx',
        'src/app/terms/page.tsx',
        'src/app/faq/page.tsx',
      ];

      businessPages.forEach((page) => {
        const fullPath = path.join(process.cwd(), page);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Should contain proper terminology
        expect(content).toMatch(/tạm ứng dịch vụ/i);
        expect(content).toMatch(/thi đấu kỹ năng/i);
        expect(content).toMatch(/hoàn tạm ứng/i);

        // Should not contain gambling terminology (except in disclaimers explaining it's NOT gambling)
        const hasGamblingTerminology =
          /cược|gambling|betting/i.test(content) &&
          !content.includes('không phải');
        const hasInvestmentTerminology =
          /đầu tư/i.test(content) && !content.includes('không phải');

        expect(hasGamblingTerminology).toBe(false);
        expect(hasInvestmentTerminology).toBe(false);
      });
    });

    it('should use proper terminology in privacy policy', () => {
      const privacyPath = path.join(process.cwd(), 'src/app/privacy/page.tsx');
      const content = fs.readFileSync(privacyPath, 'utf8');

      // Privacy policy should contain service-related terms
      expect(content).toMatch(/dịch vụ/i);
      expect(content).toMatch(/thi đấu/i);
      expect(content).toMatch(/ví tạm ứng/i);
    });
  });

  describe('Required Disclaimers', () => {
    it('should include Riot Games disclaimer', () => {
      const pagesWithDisclaimer = [
        'src/app/how-it-works/page.tsx',
        'src/app/terms/page.tsx',
        'src/components/Footer.tsx',
      ];

      pagesWithDisclaimer.forEach((page) => {
        const fullPath = path.join(process.cwd(), page);
        const content = fs.readFileSync(fullPath, 'utf8');

        expect(content).toMatch(/TFT Match không liên kết với Riot Games/i);
      });
    });

    it('should include responsible gaming notice', () => {
      const pagesWithNotice = [
        'src/app/how-it-works/page.tsx',
        'src/components/Footer.tsx',
      ];

      pagesWithNotice.forEach((page) => {
        const fullPath = path.join(process.cwd(), page);
        const content = fs.readFileSync(fullPath, 'utf8');

        expect(content).toMatch(/chơi có trách nhiệm/i);
      });
    });

    it('should include age restriction notice', () => {
      const pagesWithAgeRestriction = [
        'src/app/how-it-works/page.tsx',
        'src/app/terms/page.tsx',
        'src/components/Footer.tsx',
      ];

      pagesWithAgeRestriction.forEach((page) => {
        const fullPath = path.join(process.cwd(), page);
        const content = fs.readFileSync(fullPath, 'utf8');

        expect(content).toMatch(/18 tuổi/i);
      });
    });
  });

  describe('Navigation and Footer', () => {
    it('should have proper navigation links', () => {
      const navigationPath = path.join(
        process.cwd(),
        'src/components/Navigation.tsx'
      );
      const content = fs.readFileSync(navigationPath, 'utf8');

      expect(content).toMatch(/Thi đấu kỹ năng/i);
      expect(content).toMatch(/Ví tạm ứng/i);
      expect(content).toMatch(/Cách hoạt động/i);
      expect(content).toMatch(/FAQ/i);
    });

    it('should have proper footer links', () => {
      const footerPath = path.join(process.cwd(), 'src/components/Footer.tsx');
      const content = fs.readFileSync(footerPath, 'utf8');

      expect(content).toMatch(/Cách thức hoạt động/i);
      expect(content).toMatch(/Điều khoản dịch vụ/i);
      expect(content).toMatch(/Chính sách bảo mật/i);
      expect(content).toMatch(/Liên hệ hỗ trợ/i);
    });
  });

  describe('Home Page', () => {
    it('should use proper legal terminology', () => {
      const homePath = path.join(process.cwd(), 'src/app/page.tsx');
      const content = fs.readFileSync(homePath, 'utf8');

      expect(content).toMatch(/Thi đấu kỹ năng/i);
      expect(content).toMatch(/Phần thưởng thực tế/i);
      expect(content).toMatch(/An toàn & Minh bạch/i);
    });
  });

  describe('Contact Information', () => {
    it('should have consistent contact information', () => {
      const pagesWithContact = [
        'src/app/faq/page.tsx',
        'src/app/contact/page.tsx',
        'src/components/Footer.tsx',
      ];

      pagesWithContact.forEach((page) => {
        const fullPath = path.join(process.cwd(), page);
        const content = fs.readFileSync(fullPath, 'utf8');

        expect(content).toMatch(/tftsupp06t@gmail\.com/i);
        expect(content).toMatch(/\+84 345842088/i);
      });
    });
  });
});
