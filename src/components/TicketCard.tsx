import React from 'react';
import { CoverFlowTicketCard, CoverFlowTicketCardProps } from './CoverFlowTicketCard';

export interface TicketCardProps extends CoverFlowTicketCardProps {}

export const TicketCard: React.FC<TicketCardProps> = (props) => {
  return <CoverFlowTicketCard {...props} />;
};

export default TicketCard;
