
class Presenters:
  @staticmethod
  def technology(item):
    return {
      'client': item['client'],
      'similar_technologies': item['similar_technologies'],
      'description': item['description'],
      'origins': item['origins'],
      'technology': item['technology'],
      'category': item['category']
    }
