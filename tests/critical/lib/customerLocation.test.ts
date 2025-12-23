import { assertLocationBelongsToCustomer } from '@/lib/logistics/customerLocation';

describe('customerLocation', () => {
  describe('assertLocationBelongsToCustomer', () => {
    it('should not throw when shipperCustomerId is null', () => {
      expect(() => {
        assertLocationBelongsToCustomer({
          customerId: 1,
          shipperId: 10,
          shipperCustomerId: null,
        });
      }).not.toThrow();
    });

    it('should not throw when shipperCustomerId matches customerId', () => {
      expect(() => {
        assertLocationBelongsToCustomer({
          customerId: 1,
          shipperId: 10,
          shipperCustomerId: 1,
        });
      }).not.toThrow();
    });

    it('should throw when shipperCustomerId does not match customerId', () => {
      expect(() => {
        assertLocationBelongsToCustomer({
          customerId: 1,
          shipperId: 10,
          shipperCustomerId: 2,
        });
      }).toThrow('Location mismatch: Location 10 belongs to customer 2, not 1');
    });
  });
});
