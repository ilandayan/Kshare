-- Atomic basket reservation: prevents race conditions by using
-- a single UPDATE with WHERE clause that checks remaining stock.
-- Returns true if reservation succeeded, false if insufficient stock.
CREATE OR REPLACE FUNCTION reserve_basket_quantity(
  p_basket_id UUID,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE baskets
  SET quantity_reserved = quantity_reserved + p_quantity,
      updated_at = now()
  WHERE id = p_basket_id
    AND status = 'published'
    AND (quantity_total - quantity_reserved - quantity_sold) >= p_quantity;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- Grant access to service role (Edge Functions use service role)
GRANT EXECUTE ON FUNCTION reserve_basket_quantity(UUID, INT) TO service_role;
