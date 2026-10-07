import { describe, it, expect } from 'vitest';
import { canUseModule, financialAccess } from './permissions';

describe('permissions', () => {
  it('should allow admin to all modules', () => {
    expect(canUseModule('admin', '/configuracoes')).toBe(true);
    expect(canUseModule('admin', '/usuarios')).toBe(true);
  });

  it('should restrict financeiro role', () => {
    expect(canUseModule('financeiro', '/financeiro')).toBe(true);
    expect(canUseModule('financeiro', '/usuarios')).toBe(false);
  });

  it('should check financial access', () => {
    expect(financialAccess({ role: 'admin', modulos: [] })).toBe(true);
    expect(financialAccess({ role: 'financeiro', modulos: [] })).toBe(true);
    expect(financialAccess({ role: 'comercial', modulos: ['/financeiro'] })).toBe(true);
    expect(financialAccess({ role: 'comercial', modulos: [] })).toBe(false);
  });
});
