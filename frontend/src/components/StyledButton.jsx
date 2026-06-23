import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Link from 'next/link';

const PrimaryButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
  color: '#ffffff',
  padding: '12px 32px',
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: '8px',
  textTransform: 'none',
  boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
    boxShadow: '0 6px 20px rgba(25, 118, 210, 0.6)',
    transform: 'translateY(-2px)',
  },
}));

const SecondaryButton = styled(Button)(({ theme }) => ({
  background: 'transparent',
  color: '#1976d2',
  padding: '12px 32px',
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: '8px',
  textTransform: 'none',
  border: '2px solid #1976d2',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(25, 118, 210, 0.08)',
    borderColor: '#1565c0',
    color: '#1565c0',
    transform: 'translateY(-2px)',
  },
}));

/**
 * StyledButton component with primary and secondary variants.
 * Primary variant navigates to /login.
 * Secondary variant navigates to /leaderboard.
 *
 * @param {object} props
 * @param {'primary' | 'secondary'} props.variant - Button variant
 * @param {string} [props.href] - Override default navigation target
 * @param {React.ReactNode} props.children - Button content
 */
export default function StyledButton({ variant = 'primary', href, children, ...props }) {
  const defaultHref = variant === 'primary' ? '/login' : '/leaderboard';
  const resolvedHref = href || defaultHref;

  const ButtonComponent = variant === 'primary' ? PrimaryButton : SecondaryButton;

  return (
    <Link href={resolvedHref} passHref legacyBehavior>
      <ButtonComponent component="a" {...props}>
        {children}
      </ButtonComponent>
    </Link>
  );
}
