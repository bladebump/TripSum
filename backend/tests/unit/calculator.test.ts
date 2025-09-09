import { calculator, executeCalculation } from '../../src/utils/calculator'

describe('Calculator Utils', () => {
  describe('calculator object', () => {
    describe('add', () => {
      it('should add two positive numbers correctly', () => {
        expect(calculator.add(2, 3)).toBe(5)
        expect(calculator.add(0.1, 0.2)).toBeCloseTo(0.3)
        expect(calculator.add(100.5, 200.7)).toBeCloseTo(301.2)
      })
      
      it('should handle negative numbers', () => {
        expect(calculator.add(-5, 3)).toBe(-2)
        expect(calculator.add(-5, -3)).toBe(-8)
        expect(calculator.add(5, -3)).toBe(2)
      })
      
      it('should handle zero', () => {
        expect(calculator.add(0, 5)).toBe(5)
        expect(calculator.add(5, 0)).toBe(5)
        expect(calculator.add(0, 0)).toBe(0)
      })
    })
    
    describe('subtract', () => {
      it('should subtract two positive numbers correctly', () => {
        expect(calculator.subtract(5, 3)).toBe(2)
        expect(calculator.subtract(10.5, 5.2)).toBeCloseTo(5.3)
        expect(calculator.subtract(100, 99)).toBe(1)
      })
      
      it('should handle negative results', () => {
        expect(calculator.subtract(3, 5)).toBe(-2)
        expect(calculator.subtract(-3, 5)).toBe(-8)
        expect(calculator.subtract(3, -5)).toBe(8)
      })
      
      it('should handle zero', () => {
        expect(calculator.subtract(0, 5)).toBe(-5)
        expect(calculator.subtract(5, 0)).toBe(5)
        expect(calculator.subtract(0, 0)).toBe(0)
      })
    })
    
    describe('multiply', () => {
      it('should multiply two positive numbers correctly', () => {
        expect(calculator.multiply(2, 3)).toBe(6)
        expect(calculator.multiply(2.5, 4)).toBe(10)
        expect(calculator.multiply(0.5, 2)).toBe(1)
      })
      
      it('should handle negative numbers', () => {
        expect(calculator.multiply(-2, 3)).toBe(-6)
        expect(calculator.multiply(-2, -3)).toBe(6)
        expect(calculator.multiply(2, -3)).toBe(-6)
      })
      
      it('should handle zero', () => {
        expect(calculator.multiply(0, 5)).toBe(0)
        expect(calculator.multiply(5, 0)).toBe(0)
        expect(calculator.multiply(0, 0)).toBe(0)
      })
    })
    
    describe('divide', () => {
      it('should divide two positive numbers correctly', () => {
        expect(calculator.divide(6, 2)).toBe(3)
        expect(calculator.divide(10, 4)).toBe(2.5)
        expect(calculator.divide(1, 2)).toBe(0.5)
      })
      
      it('should handle negative numbers', () => {
        expect(calculator.divide(-6, 2)).toBe(-3)
        expect(calculator.divide(-6, -2)).toBe(3)
        expect(calculator.divide(6, -2)).toBe(-3)
      })
      
      it('should handle zero dividend', () => {
        expect(calculator.divide(0, 5)).toBe(0)
        expect(calculator.divide(0, -5)).toBe(0)
      })
      
      it('should return 0 for division by zero (no throw)', () => {
        expect(calculator.divide(5, 0)).toBe(0)
        expect(calculator.divide(-5, 0)).toBe(0)
      })
    })
  })
  
  describe('executeCalculation', () => {
    it('should execute add operation', () => {
      expect(executeCalculation('add', 5, 3)).toBe(8)
      expect(executeCalculation('add', -2, 7)).toBe(5)
    })
    
    it('should execute subtract operation', () => {
      expect(executeCalculation('subtract', 10, 4)).toBe(6)
      expect(executeCalculation('subtract', 3, 8)).toBe(-5)
    })
    
    it('should execute multiply operation', () => {
      expect(executeCalculation('multiply', 4, 5)).toBe(20)
      expect(executeCalculation('multiply', -3, 2)).toBe(-6)
    })
    
    it('should execute divide operation', () => {
      expect(executeCalculation('divide', 15, 3)).toBe(5)
      expect(executeCalculation('divide', 7, 2)).toBe(3.5)
    })
    
    it('should handle division by zero', () => {
      expect(executeCalculation('divide', 10, 0)).toBe(0)
    })
    
    it('should throw error for unknown operation', () => {
      expect(() => executeCalculation('unknown', 5, 3)).toThrow('Unknown operation: unknown')
      expect(() => executeCalculation('power', 2, 3)).toThrow('Unknown operation: power')
    })
  })
})