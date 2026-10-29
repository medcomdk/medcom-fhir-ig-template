<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:f="http://hl7.org/fhir" xmlns="http://hl7.org/fhir" exclude-result-prefixes="f">
  <xsl:output method="xml" encoding="UTF-8"/>
  <xsl:template match="@*|node()">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>
  <xsl:template match="f:ImplementationGuide/f:definition/f:page">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
      <xsl:call-template name="overview"><xsl:with-param name="name" select="'downloads'"/><xsl:with-param name="title" select="'Downloads'"/></xsl:call-template>
      <xsl:call-template name="overview"><xsl:with-param name="name" select="'profiles'"/><xsl:with-param name="title" select="'Profiles'"/></xsl:call-template>
      <xsl:call-template name="overview"><xsl:with-param name="name" select="'extensions'"/><xsl:with-param name="title" select="'Extensions'"/></xsl:call-template>
      <xsl:call-template name="overview"><xsl:with-param name="name" select="'dependencies'"/><xsl:with-param name="title" select="'Dependencies'"/></xsl:call-template>
    </xsl:copy>
  </xsl:template>
  <xsl:template name="overview">
    <xsl:param name="name"/><xsl:param name="title"/>
    <xsl:if test="not(descendant-or-self::f:page[f:nameUrl/@value=concat($name, '.html') or f:name/@value=concat($name, '.html')])">
      <page><nameUrl value="{$name}.html"/><title value="{$title}"/><generation value="generated"/></page>
    </xsl:if>
  </xsl:template>
</xsl:stylesheet>
