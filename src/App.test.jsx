import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    const elements = screen.getAllByText(/Đang kiểm tra phiên đăng nhập/i);
    expect(elements.length).toBeGreaterThan(0);
  });
});
