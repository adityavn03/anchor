use anchor_lang::prelude::*;
use anchor_spl::token::{Transfer,Mint,TokenAccount,Token,self};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint as InterfaceMint, TokenAccount as InterfaceTokenAccount}; 




declare_id!("2BwDyx8kFk5sEgAo9ddzsXGVze7V1zdTEtrdKnPtGFmh");

#[program]
pub mod Nftescrow{
    use anchor_spl::token::CloseAccount;

    use super::*;

    pub fn listnft(ctx:Context<Listnft>,price:u64)->Result<()>{

        require!(price>0,Escrowerror::PriceError);
        let nft=&mut ctx.accounts.escrow;

        nft.seller=ctx.accounts.seller.key();
        nft.mint=ctx.accounts.mint.key();
        nft.price=price;
        nft.bump=ctx.bumps.escrow;
        nft.is_sold=false;

        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(),
            Transfer { from:ctx.accounts.seller_nft_ata.to_account_info(), to: ctx.accounts.escrow_nft.to_account_info(), authority:ctx.accounts.seller.to_account_info() }, 
        )
            , 1)?;

        emit!(Nftlisted{
            seller:nft.seller,
            mint:nft.mint,
            price:price,
        });


        Ok(())

    }

    pub fn buynft(ctx:Context<Buynft>)->Result<()>{
        require!(!ctx.accounts.escrow.is_sold, Escrowerror::AlreadySold);
        anchor_lang::system_program::transfer(CpiContext::new(ctx.accounts.system_program.to_account_info()
        ,anchor_lang::system_program::Transfer{
            from:ctx.accounts.buyer.to_account_info(),
            to:ctx.accounts.seller.to_account_info(),
        }
         ), ctx.accounts.escrow.price)?;

         let seeds=&[
            b"nftescrow",
            ctx.accounts.escrow.seller.as_ref(),
            ctx.accounts.escrow.mint.as_ref(),
            &[ctx.accounts.escrow.bump],
         ];
         let sign=&[&seeds[..]];
         token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer { 
            from:ctx.accounts.escrow_nft.to_account_info() ,
            to: ctx.accounts.buyer_nft_ata.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info()
         }, sign), 1)?;

         token::close_account(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(),
             CloseAccount{
                account:ctx.accounts.escrow_nft.to_account_info(),
                destination:ctx.accounts.seller.to_account_info(),
                authority:ctx.accounts.escrow.to_account_info(),
            },
             sign,
            )
         )?;

         

         let escrow=&mut ctx.accounts.escrow;
         escrow.is_sold=true;

         emit!(Nftsolded{
            seller: escrow.seller,
            buyer: ctx.accounts.buyer.key(),
            mint: escrow.mint,
            price: escrow.price,
         });

         






        Ok(())
    }


}

//derive account

#[derive(Accounts)]
pub struct Listnft<'info>{
    #[account(init_if_needed,payer=seller,seeds=[b"nftescrow",seller.key().as_ref(),mint.key().as_ref()],bump,space=8+NftEscrow::INIT_SPACE)]
    pub escrow:Account<'info,NftEscrow>,
    
    #[account(mut)]
    pub seller:Signer<'info>,

    pub mint:InterfaceAccount<'info, InterfaceMint>,

     #[account(mut)]
     pub seller_nft_ata:InterfaceAccount<'info, InterfaceTokenAccount>,
     #[account(init_if_needed,payer=seller,associated_token::mint=mint,associated_token::authority=escrow)]
     pub escrow_nft:InterfaceAccount<'info, InterfaceTokenAccount>,
     pub token_program:Program<'info,Token>,
     pub associated_token_program:Program<'info,AssociatedToken>,
     pub system_program:Program<'info,System>,
}

#[derive(Accounts)]
pub struct Buynft<'info>{
    #[account(mut ,seeds=[b"nftescrow",seller.key().as_ref(),mint.key().as_ref()],bump=escrow.bump,close=seller)]
    pub escrow:Account<'info,NftEscrow>,
    #[account(mut)]
    pub seller:SystemAccount<'info>,
    #[account(mut)]
    pub buyer:Signer<'info>,

    pub mint:InterfaceAccount<'info, InterfaceMint>, 

    #[account(mut)]
    pub escrow_nft: InterfaceAccount<'info, InterfaceTokenAccount>, 

    #[account(init_if_needed,payer=buyer,associated_token::mint=mint,associated_token::authority=buyer)]
    pub buyer_nft_ata:InterfaceAccount<'info, InterfaceTokenAccount>, 
    pub token_program:Program<'info,Token>,
    pub associated_token_program:Program<'info,AssociatedToken>,
    pub system_program:Program<'info,System>,

    
}

//account
#[account]
#[derive(InitSpace)]
pub struct NftEscrow{
    pub seller:Pubkey,
    pub mint:Pubkey,
    pub price:u64,
    pub bump:u8,
    pub is_sold:bool,

}

//events

#[event]
pub struct  Nftlisted{
    pub seller:Pubkey,
    pub mint:Pubkey,
    pub price:u64,
}

#[event]
pub struct Nftsolded{
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub mint: Pubkey,
    pub price: u64,
}



#[error_code]
pub enum Escrowerror {
    #[msg("price need to more than 0")]
    PriceError,
    #[msg("nft already sold ")]
    AlreadySold,
    
}