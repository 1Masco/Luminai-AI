import jsPDF from 'jspdf';
import { Meeting } from '../types';

/**
 * Export meeting summary as PDF
 * @param meeting - Meeting object containing summary and metadata
 */
export const exportSummaryAsPDF = (meeting: Meeting): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Add title
  doc.setFontSize(18);
  doc.setTextColor(51, 51, 51);
  doc.text('Meeting Summary', margin, yPosition);
  yPosition += 10;

  // Add metadata
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  const meetingTitle = meeting.title || 'Untitled Meeting';
  const meetingDate = meeting.date ? new Date(meeting.date).toLocaleDateString() : 'Unknown date';
  const duration = meeting.duration ? `${Math.round(meeting.duration / 60)} minutes` : 'Unknown duration';

  doc.text(`Title: ${meetingTitle}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Date: ${meetingDate}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Duration: ${duration}`, margin, yPosition);
  yPosition += 10;

  // Add summary section
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  doc.text('Summary:', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setTextColor(33, 33, 33);

  if (meeting.summary) {
    const summaryLines = doc.splitTextToSize(meeting.summary, maxWidth);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 5 + 5;
  } else {
    doc.text('No summary available', margin, yPosition);
    yPosition += 10;
  }

  // Add action items if available
  if (meeting.actionItems && meeting.actionItems.length > 0) {
    yPosition += 5;

    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text('Action Items:', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setTextColor(33, 33, 33);

    meeting.actionItems.forEach((item, index) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }

      const bulletText = `${index + 1}. ${item}`;
      const bulletLines = doc.splitTextToSize(bulletText, maxWidth - 5);
      doc.text(bulletLines, margin + 5, yPosition);
      yPosition += bulletLines.length * 5 + 2;
    });
  }

  // Add sentiment if available
  if (meeting.sentiment) {
    yPosition += 5;

    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51);
    doc.text(`Meeting Sentiment: ${meeting.sentiment.charAt(0).toUpperCase() + meeting.sentiment.slice(1)}`, margin, yPosition);
  }

  // Save the PDF
  const filename = `${meetingTitle.replace(/\s+/g, '_')}_summary.pdf`;
  doc.save(filename);
};

/**
 * Export full meeting transcript as PDF
 * @param meeting - Meeting object containing transcript
 */
export const exportTranscriptAsPDF = (meeting: Meeting): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Add title
  doc.setFontSize(18);
  doc.setTextColor(51, 51, 51);
  doc.text('Meeting Transcript', margin, yPosition);
  yPosition += 10;

  // Add metadata
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  const meetingTitle = meeting.title || 'Untitled Meeting';
  const meetingDate = meeting.date ? new Date(meeting.date).toLocaleDateString() : 'Unknown date';

  doc.text(`Title: ${meetingTitle}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Date: ${meetingDate}`, margin, yPosition);
  yPosition += 10;

  // Add transcript
  doc.setFontSize(10);
  doc.setTextColor(33, 33, 33);

  if (meeting.transcript && meeting.transcript.length > 0) {
    const fullTranscript = meeting.transcript.map(p => `${p.speaker}: ${p.text}`).join('\n');
    const transcriptLines = doc.splitTextToSize(fullTranscript, maxWidth);
    doc.text(transcriptLines, margin, yPosition);
  } else {
    doc.text('No transcript available', margin, yPosition);
  }

  // Save the PDF
  const filename = `${meetingTitle.replace(/\s+/g, '_')}_transcript.pdf`;
  doc.save(filename);
};

/**
 * Export full meeting report (summary + transcript + metadata) as PDF
 * @param meeting - Meeting object with all data
 */
export const exportFullReportAsPDF = (meeting: Meeting): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Title Page
  doc.setFontSize(20);
  doc.setTextColor(51, 51, 51);
  doc.text('Meeting Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Metadata
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  const meetingTitle = meeting.title || 'Untitled Meeting';
  doc.text(meetingTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  const meetingDate = meeting.date ? new Date(meeting.date).toLocaleDateString() : 'Unknown date';
  const duration = meeting.duration ? `${Math.round(meeting.duration / 60)} minutes` : 'Unknown duration';

  doc.text(`Date: ${meetingDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  doc.text(`Duration: ${duration}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;

  if (meeting.sentiment) {
    const sentiment = meeting.sentiment.charAt(0).toUpperCase() + meeting.sentiment.slice(1);
    doc.text(`Sentiment: ${sentiment}`, pageWidth / 2, yPosition, { align: 'center' });
  }

  // Add page break
  doc.addPage();
  yPosition = margin;

  // Summary Section
  doc.setFontSize(14);
  doc.setTextColor(51, 51, 51);
  doc.text('Summary', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(33, 33, 33);

  if (meeting.summary) {
    const summaryLines = doc.splitTextToSize(meeting.summary, maxWidth);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 5 + 10;
  }

  // Action Items Section
  if (meeting.actionItems && meeting.actionItems.length > 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('Action Items', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(33, 33, 33);

    meeting.actionItems.forEach((item, index) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }

      const bulletText = `${index + 1}. ${item}`;
      const bulletLines = doc.splitTextToSize(bulletText, maxWidth - 10);
      doc.text(bulletLines, margin + 5, yPosition);
      yPosition += bulletLines.length * 5 + 3;
    });
  }

  // Transcript Section
  doc.addPage();
  yPosition = margin;

  doc.setFontSize(14);
  doc.setTextColor(51, 51, 51);
  doc.text('Full Transcript', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setTextColor(33, 33, 33);

  if (meeting.transcript && meeting.transcript.length > 0) {
    const fullTranscript = meeting.transcript.map(p => `${p.speaker}: ${p.text}`).join('\n');
    const transcriptLines = doc.splitTextToSize(fullTranscript, maxWidth);
    doc.text(transcriptLines, margin, yPosition);
  } else {
    doc.text('No transcript available', margin, yPosition);
  }

  // Save the PDF
  const filename = `${meetingTitle.replace(/\s+/g, '_')}_full_report.pdf`;
  doc.save(filename);
};

/**
 * Import meeting from PDF (placeholder for future implementation)
 * This would require PDF parsing on frontend or backend
 */
export const importMeetingFromPDF = async (file: File): Promise<any> => {
  // This would be implemented on the backend using a PDF parser
  // For now, this is a placeholder that returns the file data
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/ai/process-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to process PDF');
    }

    return await response.json();
  } catch (error) {
    console.error('Error importing PDF:', error);
    throw error;
  }
};
