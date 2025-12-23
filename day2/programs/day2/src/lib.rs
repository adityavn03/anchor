use anchor_lang::prelude::*;
use anchor_spl::token::{self,Mint,Token,TokenAccount,MintTo};
use anchor_spl::associated_token::AssociatedToken;
declare_id!("3NXEapffk9FyYM9xmwTH7XYtoFB3RmJp38467znBU7qS");

#[program]
pub mod cpi_contract{
    use super::*;

    pub fn inizialize_mint(ctx:Context<InizializeMint>)->Result<()>{
        Ok(())

    }

    pub fn mint_token(ctx:Context<Tokenmint>,amount:u64)->Result<()>{
        let cpi_program=ctx.accounts.token_program.to_account_info();
        let cpi_account=MintTo{
            mint:ctx.accounts.mint.to_account_info(),
            to:ctx.accounts.userAta.to_account_info(),
            authority:ctx.accounts.authority.to_account_info(),
        };
        token::mint_to(CpiContext::new(cpi_program, cpi_account)
        ,amount )?;
        Ok(())
    }
}

#[derive(Accounts)]

pub struct InizializeMint<'info>{
    #[account(
        init,
        payer=authority,
        mint::decimals=6,
        mint::authority=authority,
        mint::freeze_authority=authority,
    )]
    pub mint:Account<'info,Mint>,
    #[account(mut)]
    pub authority:Signer<'info>,
    pub token_program:Program<'info,Token>,
    pub system_program:Program<'info,System>,
    pub rent:Sysvar<'info,Rent>, 

}

#[derive(Accounts)]

pub struct Tokenmint<'info>{

    #[account(mut)]
    pub mint:Account<'info,Mint>,

    #[account(
        init_if_needed,
        payer=authority,
        associated_token::mint=mint,
        associated_token::authority=authority,
    )]
    pub userAta:Account<'info,TokenAccount>,
    #[account(mut)]
    pub authority:Signer<'info>,
    pub token_program:Program<'info,Token>,
    pub associated_token_program:Program<'info,AssociatedToken>,
    pub system_program:Program<'info,System>,


}
