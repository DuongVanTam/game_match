-- Create settle_match function
CREATE OR REPLACE FUNCTION settle_match(
  p_match_id UUID,
  p_winner_id UUID,
  p_prize_amount INTEGER,
  p_service_fee INTEGER,
  p_proof_image_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
  v_active_players UUID[];
  v_player RECORD;
  v_winner_wallet_id UUID;
  v_winner_balance INTEGER;
BEGIN
  -- Get match details
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  -- Check if match is ongoing
  IF v_match.status != 'ongoing' THEN
    RAISE EXCEPTION 'Match must be ongoing to settle';
  END IF;
  
  -- Get active players
  SELECT ARRAY_AGG(user_id) INTO v_active_players
  FROM match_players 
  WHERE match_id = p_match_id AND status = 'active';
  
  -- Verify winner is in active players
  IF NOT (p_winner_id = ANY(v_active_players)) THEN
    RAISE EXCEPTION 'Winner must be an active player';
  END IF;
  
  -- Get winner's wallet
  SELECT id, balance INTO v_winner_wallet_id, v_winner_balance
  FROM wallets WHERE user_id = p_winner_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winner wallet not found';
  END IF;
  
  -- Update match status and winner
  UPDATE matches 
  SET 
    status = 'completed',
    winner_id = p_winner_id,
    proof_image_url = p_proof_image_url,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_match_id;
  
  -- Add prize to winner's wallet
  UPDATE wallets 
  SET 
    balance = balance + p_prize_amount,
    updated_at = NOW()
  WHERE user_id = p_winner_id;
  
  -- Add ledger entry for prize
  INSERT INTO ledger (
    user_id,
    transaction_type,
    amount,
    balance_after,
    reference_id,
    reference_type,
    description,
    metadata
  ) VALUES (
    p_winner_id,
    'win_prize',
    p_prize_amount,
    v_winner_balance + p_prize_amount,
    p_match_id,
    'match',
    'Giải thưởng từ trận đấu: ' || v_match.title,
    jsonb_build_object(
      'match_id', p_match_id,
      'match_title', v_match.title,
      'prize_amount', p_prize_amount,
      'service_fee', p_service_fee,
      'total_pool', p_prize_amount + p_service_fee
    )
  );
  
  -- Add ledger entry for service fee (platform revenue)
  INSERT INTO ledger (
    user_id,
    transaction_type,
    amount,
    balance_after,
    reference_id,
    reference_type,
    description,
    metadata
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Platform user ID
    'service_fee',
    p_service_fee,
    0, -- Platform balance (not tracked)
    p_match_id,
    'match',
    'Phí dịch vụ từ trận đấu: ' || v_match.title,
    jsonb_build_object(
      'match_id', p_match_id,
      'match_title', v_match.title,
      'prize_amount', p_prize_amount,
      'service_fee', p_service_fee,
      'total_pool', p_prize_amount + p_service_fee
    )
  );
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION settle_match TO authenticated;
