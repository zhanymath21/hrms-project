// src/components/CustomTimeline.jsx

import React from 'react';
import { Box, Paper, Typography, Chip, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';

const TimelineContainer = styled(Box)(({ theme }) => ({
    position: 'relative',
    padding: theme.spacing(2),
    '&::before': {
        content: '""',
        position: 'absolute',
        left: '120px',
        top: 0,
        bottom: 0,
        width: '2px',
        backgroundColor: theme.palette.divider,
    },
}));

const TimelineItemWrapper = styled(Box)(({ theme }) => ({
    position: 'relative',
    display: 'flex',
    marginBottom: theme.spacing(3),
    '&:last-child': {
        marginBottom: 0,
    },
}));

const TimelineOppositeContentStyled = styled(Box)(({ theme }) => ({
    flex: '0 0 120px',
    paddingRight: theme.spacing(2),
    textAlign: 'right',
    paddingTop: theme.spacing(1),
}));

const TimelineSeparatorStyled = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingRight: theme.spacing(2),
    position: 'relative',
    zIndex: 1,
}));

const TimelineDotStyled = styled(Box)(({ theme, bgcolor, textcolor }) => ({
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: bgcolor || theme.palette.primary.main,
    color: textcolor || '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `3px solid ${theme.palette.background.paper}`,
    boxShadow: theme.shadows[2],
}));

const TimelineConnectorStyled = styled(Box)(({ theme }) => ({
    width: 2,
    flex: 1,
    backgroundColor: theme.palette.divider,
    minHeight: 20,
}));

const TimelineContentStyled = styled(Box)(({ theme }) => ({
    flex: 1,
    paddingTop: theme.spacing(0.5),
}));

// ==================== MAIN COMPONENTS ====================

export const Timeline = ({ children, position = 'right', sx = {} }) => {
    return (
        <TimelineContainer sx={sx}>
            {React.Children.map(children, (child, index) => {
                if (!child) return null;
                const isLast = index === React.Children.count(children) - 1;
                return React.cloneElement(child, { isLast });
            })}
        </TimelineContainer>
    );
};

export const TimelineItem = ({ children, isLast }) => {
    return (
        <TimelineItemWrapper>
            {React.Children.map(children, (child) => {
                if (child?.type === TimelineOppositeContent) {
                    return child;
                }
                return child;
            })}
            {!isLast && React.Children.map(children, (child) => {
                if (child?.type === TimelineSeparator) {
                    return React.cloneElement(child, { showConnector: true });
                }
                return child;
            })}
        </TimelineItemWrapper>
    );
};

export const TimelineOppositeContent = ({ children, sx = {} }) => {
    return (
        <TimelineOppositeContentStyled sx={sx}>
            {children}
        </TimelineOppositeContentStyled>
    );
};

export const TimelineSeparator = ({ children, showConnector, sx = {} }) => {
    return (
        <TimelineSeparatorStyled sx={sx}>
            {children}
            {showConnector && <TimelineConnector />}
        </TimelineSeparatorStyled>
    );
};

export const TimelineDot = ({ children, bgcolor, textcolor, sx = {} }) => {
    return (
        <TimelineDotStyled bgcolor={bgcolor} textcolor={textcolor} sx={sx}>
            {children}
        </TimelineDotStyled>
    );
};

export const TimelineConnector = ({ sx = {} }) => {
    return <TimelineConnectorStyled sx={sx} />;
};

export const TimelineContent = ({ children, sx = {} }) => {
    return (
        <TimelineContentStyled sx={sx}>
            {children}
        </TimelineContentStyled>
    );
};

// Default export untuk kemudahan
const CustomTimeline = {
    Timeline,
    TimelineItem,
    TimelineOppositeContent,
    TimelineSeparator,
    TimelineDot,
    TimelineConnector,
    TimelineContent,
};

export default CustomTimeline;