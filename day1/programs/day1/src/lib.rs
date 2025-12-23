use anchor_lang::{prelude::*};
declare_id!("3uRnwLkhW1PeGnfdKiwK9TMLnqmB9bFMdSRG1eVeYdRA");

#[program]
pub mod bank_account{

    use super::*;
    pub fn deposit(ctx:Context<Deposit>,amounts:i32)->Result<()>{

        let value=&mut ctx.accounts.b_account.amount_store;
        *value+=amounts;

        Ok(())
    }

    pub fn withdraw(ctx:Context<Withdraw>,amounts:i32)->Result<()>{
        let value=&mut ctx.accounts.b_account.amount_store;
        require!(*value>=amounts,bankerror::InsufficentBalance);
        *value-=amounts;
        
        Ok(())

    }


}
#[account]
#[derive(InitSpace)]
pub struct bankvalue{
    #[max_len()]
    amount_store:i32
}
#[derive(Accounts)]
pub  struct Deposit<'info>{
    #[account(init,payer=user,seeds=[b"b_account",user.key().as_ref()],bump,space=8+bankvalue::INIT_SPACE)]
    pub b_account:Account<'info,bankvalue>,
    #[account(mut)]
    pub user:Signer<'info>,
    
    pub system_program:Program<'info,System>,

}

#[derive(Accounts)]

pub struct Withdraw<'info>{
    #[account(mut,seeds=[b"b_account",user.key().as_ref()],bump)]
    pub b_account:Account<'info,bankvalue>,
    #[account(mut)]
    pub user:Signer<'info>,

    pub system_program:Program<'info,System>,


}

#[error_code]
pub enum bankerror{
    #[msg("you does not have the enought token to withdraw the payment ")]
    InsufficentBalance,
}