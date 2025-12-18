#!/usr/bin/env python3
"""
Test script for user segments functionality
"""
import asyncio
import sys
sys.path.append('/Users/anupamsingh/Documents/mygit/optifork/backend')

from sqlalchemy.ext.asyncio import AsyncSession
from db import init_database, get_db
from models import Base, UserSegment, FlagSegment, FeatureFlag
import crud
from backend.schemas import UserSegmentIn, SegmentCondition, FlagSegmentIn, UserContext

async def test_user_segments():
    """Test user segments functionality"""
    print("🚀 Testing User Segments Implementation")
    
    # Initialize database
    await init_database()
    
    # Get database session
    async for db in get_db():
        try:
            print("📊 Database connection established")
            
            # Test 1: Create a user segment
            print("\n1️⃣ Creating user segment...")
            conditions = [
                SegmentCondition(field="country", operator="equals", value="US"),
                SegmentCondition(field="plan_type", operator="in", value=["premium", "enterprise"])
            ]
            
            segment_data = UserSegmentIn(
                name="US Premium Users",
                description="Premium and enterprise users from the United States",
                conditions=conditions
            )
            
            segment = await crud.create_user_segment(db, segment_data)
            print(f"✅ Created segment: {segment.name} (ID: {segment.id})")
            
            # Test 2: Create another segment
            print("\n2️⃣ Creating another user segment...")
            beta_conditions = [
                SegmentCondition(field="beta_user", operator="equals", value=True),
                SegmentCondition(field="signup_date", operator="greater_than", value="2024-01-01")
            ]
            
            beta_segment_data = UserSegmentIn(
                name="Beta Users",
                description="Beta users who signed up after Jan 1, 2024",
                conditions=beta_conditions
            )
            
            beta_segment = await crud.create_user_segment(db, beta_segment_data)
            print(f"✅ Created segment: {beta_segment.name} (ID: {beta_segment.id})")
            
            # Test 3: List all segments
            print("\n3️⃣ Listing all segments...")
            all_segments = await crud.get_all_user_segments(db)
            for seg in all_segments:
                print(f"   - {seg.name}: {len(seg.conditions)} conditions")
            
            # Test 4: Create a feature flag
            print("\n4️⃣ Creating a feature flag for testing...")
            from backend.schemas import FeatureFlagIn, RuleIn
            
            flag_data = FeatureFlagIn(
                name="new_dashboard",
                description="New dashboard UI",
                rollout=0.5,
                rules=[]
            )
            
            flag = await crud.create_flag(db, flag_data)
            print(f"✅ Created flag: {flag.name} (ID: {flag.id})")
            
            # Test 5: Associate segments with the flag
            print("\n5️⃣ Associating segments with flag...")
            
            # Associate US Premium Users with 80% rollout, high priority
            premium_association = FlagSegmentIn(
                segment_id=segment.id,
                enabled=True,
                rollout_percentage=80.0,
                priority=10
            )
            
            flag_segment1 = await crud.add_segment_to_flag(db, flag.id, premium_association)
            print(f"✅ Associated {segment.name} with {flag.name} (80% rollout, priority 10)")
            
            # Associate Beta Users with 100% rollout, lower priority
            beta_association = FlagSegmentIn(
                segment_id=beta_segment.id,
                enabled=True,
                rollout_percentage=100.0,
                priority=5
            )
            
            flag_segment2 = await crud.add_segment_to_flag(db, flag.id, beta_association)
            print(f"✅ Associated {beta_segment.name} with {flag.name} (100% rollout, priority 5)")
            
            # Test 6: Test segment evaluation
            print("\n6️⃣ Testing segment evaluation...")
            
            # Test user that matches US Premium Users segment
            premium_user = UserContext(
                user_id="user123",
                traits={
                    "country": "US",
                    "plan_type": "premium",
                    "user_id": "user123"
                }
            )
            
            matches_premium = await crud.evaluate_user_segment(db, segment.id, premium_user)
            print(f"   Premium user matches US Premium segment: {matches_premium}")
            
            # Test user that matches Beta Users segment
            beta_user = UserContext(
                user_id="user456",
                traits={
                    "beta_user": True,
                    "signup_date": "2024-06-15",
                    "user_id": "user456"
                }
            )
            
            matches_beta = await crud.evaluate_user_segment(db, beta_segment.id, beta_user)
            print(f"   Beta user matches Beta segment: {matches_beta}")
            
            # Test user that doesn't match any segment
            regular_user = UserContext(
                user_id="user789",
                traits={
                    "country": "Canada",
                    "plan_type": "free",
                    "user_id": "user789"
                }
            )
            
            matches_premium_regular = await crud.evaluate_user_segment(db, segment.id, regular_user)
            matches_beta_regular = await crud.evaluate_user_segment(db, beta_segment.id, regular_user)
            print(f"   Regular user matches US Premium segment: {matches_premium_regular}")
            print(f"   Regular user matches Beta segment: {matches_beta_regular}")
            
            # Test 7: Find matching segments for flag
            print("\n7️⃣ Testing segment matching for flag evaluation...")
            
            premium_matching = await crud.find_matching_segments(db, flag.id, premium_user)
            print(f"   Premium user matches {len(premium_matching)} segments for flag {flag.name}")
            if premium_matching:
                print(f"   → Highest priority segment: {premium_matching[0].segment.name} (priority {premium_matching[0].priority})")
            
            beta_matching = await crud.find_matching_segments(db, flag.id, beta_user)
            print(f"   Beta user matches {len(beta_matching)} segments for flag {flag.name}")
            if beta_matching:
                print(f"   → Highest priority segment: {beta_matching[0].segment.name} (priority {beta_matching[0].priority})")
            
            regular_matching = await crud.find_matching_segments(db, flag.id, regular_user)
            print(f"   Regular user matches {len(regular_matching)} segments for flag {flag.name}")
            
            # Test 8: Test different operators
            print("\n8️⃣ Testing different condition operators...")
            
            # Test numeric operators
            age_user = UserContext(
                user_id="user999",
                traits={
                    "age": 25,
                    "user_id": "user999"
                }
            )
            
            age_condition = {"field": "age", "operator": "greater_than", "value": 18}
            age_result = crud.evaluate_segment_condition(age_user.traits, age_condition)
            print(f"   Age 25 > 18: {age_result}")
            
            # Test 'in' operator
            plan_condition = {"field": "plan_type", "operator": "in", "value": ["premium", "enterprise"]}
            premium_result = crud.evaluate_segment_condition(premium_user.traits, plan_condition)
            print(f"   Premium plan in [premium, enterprise]: {premium_result}")
            
            free_user_traits = {"plan_type": "free", "user_id": "test"}
            free_result = crud.evaluate_segment_condition(free_user_traits, plan_condition)
            print(f"   Free plan in [premium, enterprise]: {free_result}")
            
            print("\n🎉 All tests completed successfully!")
            
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
        
        break  # Exit the async generator

if __name__ == "__main__":
    asyncio.run(test_user_segments())