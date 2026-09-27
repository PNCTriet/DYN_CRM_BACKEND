import { renderTemplate } from './render-template';

describe('renderTemplate', () => {
  it('replaces known placeholders', () => {
    expect(renderTemplate('Hi {{name}}, {{amount}}', { name: 'An', amount: '10' })).toBe(
      'Hi An, 10',
    );
  });

  it('keeps unknown placeholders', () => {
    expect(renderTemplate('Hi {{name}}', {})).toBe('Hi {{name}}');
  });
});
